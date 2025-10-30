import { createClient } from '@supabase/supabase-js';
import { EncryptionService } from '../../services/encryption';
import { HederaClient } from '../../services/hedera/client';
import { FileMetadata } from './types';

interface FilePermission {
  id: string;
  file_id: string;
  grantee_id: string;
  granted_by: string;
  hedera_transaction_id: string;
  created_at: string;
}

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_ANON_KEY ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

async function verifyF2Access(fileId: string, userId: string): Promise<boolean> {
  const { data: permission, error } = await supabase
    .from('file_permissions')
    .select()
    .eq('file_id', fileId)
    .eq('grantee_id', userId)
    .single();

  if (error || !permission) {
    return false;
  }

  // Verify the permission on Hedera (smart contract)
  try {
    // Note: Implementation depends on your smart contract structure
    // const isValid = await hederaClient.verifyAccess(permission.hedera_transaction_id);
    // return isValid;
    return true;
  } catch (error) {
    console.error('Failed to verify Hedera permission:', error);
    return false;
  }
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'GET') {
      throw new Error('Method not allowed');
    }

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      throw new Error('Invalid token');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select()
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
      .select()
      .eq('id', fileId)
      .single();

    if (fileError || !file) {
      throw new Error('File not found');
    }

    // Check access permissions
    if (file.owner_id !== profile.id) {
      if (profile.subscription_tier === 'F2') {
        const hasAccess = await verifyF2Access(fileId, profile.id);
        if (!hasAccess) {
          throw new Error('Access denied');
        }
      } else {
        throw new Error('Access denied');
      }
    }

    // Download encrypted file from storage
    const { data: encryptedData, error: downloadError } = await supabase.storage
      .from('encrypted-files')
      .download(file.storage_path);

    if (downloadError || !encryptedData) {
      throw new Error('Failed to download file');
    }

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
      await supabase.from('file_access_logs').insert({
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
      await supabase.from('file_access_logs').insert({
        file_id: fileId,
        user_id: profile.id,
        access_type: 'download',
        status: 'failed',
        error: 'Decryption failed'
      });
      
      throw new Error('Failed to decrypt file');
    }

  } catch (error) {
    let errorMessage = 'Unknown error';
    let statusCode = 500;
    let profileId = 'unknown';
    let fileIdFromUrl = 'unknown';

    try {
      if (error instanceof Error) {
        errorMessage = error.message;
        statusCode = error.message.includes('limit exceeded') || 
                    error.message.includes('Access denied') ? 403 : 500;
      }

      // Extract fileId from URL if possible
      const url = new URL(req.url);
      fileIdFromUrl = url.searchParams.get('fileId') || 'unknown';

      // Log access failures
      if (errorMessage.includes('Access denied') || errorMessage.includes('integrity')) {
        await supabase.from('file_access_logs').insert({
          file_id: fileIdFromUrl,
          user_id: profileId,
          access_type: 'download',
          status: 'failed',
          error: errorMessage
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({ 
      error: errorMessage,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode
    });
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};