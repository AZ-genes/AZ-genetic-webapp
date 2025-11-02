import { EncryptionService } from '../../services/encryption';
import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

const encryptionService = new EncryptionService();

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
  supabase: any,
  fileId: string,
  userId: string
): Promise<boolean> {
  const { data: permissions, error: permissionsError } = await supabase
    .from('file_permissions')
    .select('*')
    .eq('file_id', fileId)
    .eq('grantee_id', userId)
    .eq('status', 'active')
    .gte('expires_at', new Date().toISOString());

  if (permissionsError || !permissions || permissions.length === 0) {
    return false;
  }

  // Permission exists in database - no need for Hedera verification
  return true;
}

async function handleGetFile(req: Request, context: AuthContext): Promise<Response> {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  try {
    const { user, supabase } = context;

    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

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
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      throw new Error('File not found');
    }

    // Check access permissions
    if (file.owner_id !== profile.id) {
      if (profile.subscription_tier === 'F2') {
        const hasAccess = await verifyF2Access(supabase, fileId, profile.id);
        if (!hasAccess) {
          throw new Error('Access denied');
        }
      } else {
        throw new Error('Access denied');
      }
    }

    // Download encrypted file from Supabase Storage
    const { data: encryptedData, error: downloadError } = await supabase.storage
      .from('encrypted-files')
      .download(file.storage_path);

    if (downloadError || !encryptedData) {
      throw new Error('Failed to download file');
    }

    const encryptedBuffer = Buffer.from(await encryptedData.arrayBuffer());

    // Verify file integrity for F2 users
    if (profile.subscription_tier === 'F2') {
      try {
        // Verify hash matches the stored hash from database
        const hashMatches = await encryptionService.verifyHash(encryptedBuffer, file.hash);
        if (!hashMatches) {
          throw new Error('File integrity verification failed');
        }
      } catch (error) {
        throw new Error('Failed to verify file integrity');
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
      await supabase.from('file_access_logs').insert({
        file_id: fileId,
        user_id: profile.id,
        access_type: 'download',
        status: 'success',
        created_at: new Date().toISOString()
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
      await supabase.from('file_access_logs').insert({
        file_id: fileId,
        user_id: profile.id,
        access_type: 'download',
        status: 'failed',
        error: 'Decryption failed',
        created_at: new Date().toISOString()
      });
      
      throw new Error('Failed to decrypt file');
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof Error && 
      (message.includes('limit exceeded') || 
       message.includes('Access denied') ||
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
