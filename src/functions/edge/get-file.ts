import { EncryptionService } from '../../services/encryption';
import { HederaClient } from '../../services/hedera/client';
import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

const encryptionService = new EncryptionService();
const hederaClient = new HederaClient();

// Constants
const MAX_DOWNLOADS_PER_HOUR = 20;
const DOWNLOAD_WINDOW = 3600000; // 1 hour in milliseconds
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Rate limiting map (in production, use Redis)
const downloadLimits = new Map<string, { count: number; lastReset: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = downloadLimits.get(userId) || { count: 0, lastReset: now };

  if (now - userLimit.lastReset > DOWNLOAD_WINDOW) {
    userLimit.count = 0;
    userLimit.lastReset = now;
  }

  if (userLimit.count >= MAX_DOWNLOADS_PER_HOUR) {
    return false;
  }

  userLimit.count++;
  downloadLimits.set(userId, userLimit);
  return true;
}

async function verifyF2Access(
  firestore: AuthContext['firestore'],
  fileId: string,
  userId: string
): Promise<boolean> {
  const permissionsQuery = firestore.collection('file_permissions')
    .where('file_id', '==', fileId)
    .where('grantee_id', '==', userId)
    .where('status', '==', 'active')
    .where('expires_at', '>=', new Date().toISOString());
  const snapshot = await permissionsQuery.get();

  if (snapshot.empty) {
    return false;
  }

  const permission = snapshot.docs[0].data();

  // Verify the permission on Hedera (smart contract)
  try {
    const isValid = await hederaClient.verifyAccess(permission.hedera_transaction_id);
    return isValid;
  } catch (error) {
    console.error('Failed to verify Hedera permission:', error);
    return false;
  }
}

async function handleGetFile(req: Request, context: AuthContext): Promise<Response> {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  try {
    const { user, firestore, storage } = context;

    const profileRef = firestore.collection('user_profiles').doc(user.uid);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      throw new Error('User profile not found');
    }
    const profile = profileDoc.data();

    // Check rate limit
    if (!checkRateLimit(profile.id)) {
      throw new Error(`Download limit exceeded. Maximum ${MAX_DOWNLOADS_PER_HOUR} downloads per hour.`);
    }

    // Get URL parameters
    const url = new URL(req.url);
    const fileId = url.searchParams.get('fileId');
    if (!fileId) {
      throw new Error('File ID is required');
    }

    // Get file metadata
    const fileRef = firestore.collection('files').doc(fileId);
    const fileDoc = await fileRef.get();

    if (!fileDoc.exists) {
      throw new Error('File not found');
    }
    const file = fileDoc.data();

    // Check access permissions
    if (file.owner_id !== profile.id) {
      if (profile.subscription_tier === 'F2') {
        const hasAccess = await verifyF2Access(firestore, fileId, profile.id);
        if (!hasAccess) {
          throw new Error('Access denied');
        }
      } else {
        throw new Error('Access denied');
      }
    }

    // Download encrypted file from storage
    const storageRef = storage.ref(file.storage_path);
    const encryptedData = await storage.getBlob(storageRef);
    const encryptedBuffer = Buffer.from(await encryptedData.arrayBuffer());

    // Verify file integrity
    if (profile.subscription_tier === 'F2') {
      try {
        // Get stored hash from Hedera
        const storedHash = await hederaClient.getHashFromMirrorNode(file.hedera_transaction_id);
        
        // Verify hash matches
        const hashMatches = await encryptionService.verifyHash(encryptedBuffer, storedHash);
        if (!hashMatches) {
          throw new Error('File integrity verification failed');
        }
      } catch (error) {
        throw new Error('Failed to verify file integrity with Hedera');
      }
    }

    // Verify file size
    if (encryptedBuffer.length > MAX_FILE_SIZE) {
      throw new Error('File size exceeds maximum allowed size');
    }

    // Decrypt file
    try {
      const decryptedData = await encryptionService.decryptFile(
        encryptedBuffer,
        file.encryption_key,
        file.encryption_iv
      );

      // Add audit log
      await firestore.collection('file_access_logs').add({
        file_id: fileId,
        user_id: profile.id,
        access_type: 'download',
        status: 'success'
      });

      // Return decrypted file
      return new Response(new Uint8Array(decryptedData), {
        headers: {
          ...corsHeaders,
          'Content-Type': file.file_type,
          'Content-Disposition': `attachment; filename="${file.file_name}"`,
          'Content-Length': decryptedData.length.toString(),
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
    } catch (decryptError) {
      // Log decryption failure
      await firestore.collection('file_access_logs').add({
        file_id: fileId,
        user_id: profile.id,
        access_type: 'download',
        status: 'failed',
        error: 'Decryption failed'
      });
      
      throw new Error('Failed to decrypt file');
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof Error && 
      (message.includes('limit exceeded') || 
       message.includes('Access denied') ||
       message.includes('not found')) ? 400 : 500;

    // Log the error
    try {
      await context.firestore.collection('error_logs').add({
        error_type: 'get_file_failed',
        error_message: message,
        metadata: {
          request_url: req.url,
          timestamp: new Date().toISOString(),
          user_id: context.user.id
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({ 
      error: message,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode
    });
  }
}

export async function onRequest(req: Request, context: AuthContext): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({
      error: 'Method not allowed',
      code: 'MethodNotAllowed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    return await withAuth(req, context, handleGetFile);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof Error && 
      (message.includes('limit exceeded') || 
       message.includes('access denied') ||
       message.includes('not found')) ? 400 : 500;

    return new Response(JSON.stringify({ 
      error: message,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode
    });
  }
}