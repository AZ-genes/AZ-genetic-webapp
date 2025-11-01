import { createClient } from '@supabase/supabase-js';
import { ContractId } from '@hashgraph/sdk';
import { HederaClient } from '../../services/hedera/client';
import { FilePermission } from './types';

interface ExtendedPermission extends FilePermission {
  expires_at: string;
  access_level: 'read' | 'read_write';
  status: 'active' | 'revoked' | 'expired';
}

interface GrantAccessRequest {
  fileId: string;
  granteeId: string;
  expiresAt?: string;
  accessLevel?: 'read' | 'read_write';
  notes?: string;
}

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_ANON_KEY ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

const hederaClient = new HederaClient();
const CONTRACT_ID = ContractId.fromString(process.env.HEDERA_CONTRACT_ID ?? '');

// Constants
const MAX_GRANTS_PER_DAY = 50;
const GRANT_WINDOW = 86400000; // 24 hours in milliseconds
const MAX_EXPIRY_DAYS = 365; // Maximum 1 year access grant
const DEFAULT_EXPIRY_DAYS = 30; // Default 30 days access

// Rate limiting map (in production, use Redis)
const grantLimits = new Map<string, { count: number; lastReset: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = grantLimits.get(userId) || { count: 0, lastReset: now };

  if (now - userLimit.lastReset > GRANT_WINDOW) {
    userLimit.count = 0;
    userLimit.lastReset = now;
  }

  if (userLimit.count >= MAX_GRANTS_PER_DAY) {
    return false;
  }

  userLimit.count++;
  grantLimits.set(userId, userLimit);
  return true;
}

async function validateExpiryDate(expiresAt: string | undefined): Promise<string> {
  const now = new Date();
  let expiry: Date;

  if (!expiresAt) {
    expiry = new Date(now.getTime() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  } else {
    expiry = new Date(expiresAt);
    if (isNaN(expiry.getTime())) {
      throw new Error('Invalid expiration date format');
    }

    const maxExpiry = new Date(now.getTime() + MAX_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    if (expiry > maxExpiry) {
      throw new Error(`Maximum expiration date is ${MAX_EXPIRY_DAYS} days from now`);
    }

    if (expiry <= now) {
      throw new Error('Expiration date must be in the future');
    }
  }

  return expiry.toISOString();
}

async function notifyGrantee(granteeId: string, fileMetadata: any, granterId: string) {
  try {
    // Get grantee's notification preferences
    const { data: grantee } = await supabase
      .from('user_profiles')
      .select('email, notification_preferences')
      .eq('id', granteeId)
      .single();

    if (grantee?.email) {
      // In production, implement proper email notification system
      console.log(`Would send email to ${grantee.email} about new file access`);
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: granteeId,
      type: 'access_granted',
      message: `You've been granted access to file: ${fileMetadata.file_name}`,
      metadata: {
        file_id: fileMetadata.id,
        granted_by: granterId
      }
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
    // Don't throw - notification failure shouldn't block the access grant
  }
}

async function handleGrantAccess(req: Request): Promise<Response> {
  // Start a transaction by enabling realtime
  const { error: txError } = await supabase.rpc('begin_transaction');
  if (txError) throw txError;

  try {
    const { data: profile } = await validateAndGetProfile(req);
    const body = await validateRequestBody(req);
    const file = await validateFileOwnership(body.fileId, profile.id);
    await validateGrantee(body.granteeId);
    
    // Check rate limit
    if (!checkRateLimit(profile.id)) {
      throw new Error(`Grant limit exceeded. Maximum ${MAX_GRANTS_PER_DAY} grants per day.`);
    }

    // Check existing permissions
    await checkExistingPermissions(body.fileId, body.granteeId);
    
    // Validate and set expiration date
    const expiresAt = await validateExpiryDate(body.expiresAt);

    // Update smart contract and save permission
    const result = await savePermission(body, profile.id, expiresAt);
    
    // Commit transaction
    await supabase.rpc('commit_transaction');
    
    // Notify grantee (non-blocking)
    notifyGrantee(body.granteeId, file, profile.id);

    return result;
  } catch (error) {
    // Rollback transaction
    await supabase.rpc('rollback_transaction');
    throw error;
  }
}

async function validateAndGetProfile(req: Request) {
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

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select()
    .eq('auth_id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('User profile not found');
  }

  if (profile.subscription_tier !== 'F1') {
    throw new Error('Only F1 users can grant access');
  }

  return { data: profile };
}

async function validateRequestBody(req: Request): Promise<GrantAccessRequest> {
  const body: GrantAccessRequest = await req.json();
  if (!body.fileId || !body.granteeId) {
    throw new Error('Missing required fields: fileId, granteeId');
  }

  if (body.accessLevel && !['read', 'read_write'].includes(body.accessLevel)) {
    throw new Error('Invalid access level. Must be "read" or "read_write"');
  }

  return body;
}

async function savePermission(
  body: GrantAccessRequest, 
  grantorId: string, 
  expiresAt: string
): Promise<Response> {
  const hederaTxId = await hederaClient.grantAccess(
    CONTRACT_ID,
    body.fileId,
    body.granteeId
  );

  const permission: Partial<ExtendedPermission> = {
    file_id: body.fileId,
    grantee_id: body.granteeId,
    granted_by: grantorId,
    hedera_transaction_id: hederaTxId,
    expires_at: expiresAt,
    access_level: body.accessLevel || 'read',
    status: 'active'
  };

  const { data: savedPermission, error: saveError } = await supabase
    .from('file_permissions')
    .insert(permission)
    .select()
    .single();

  if (saveError) {
    throw saveError;
  }

  await supabase.from('access_logs').insert({
    file_id: body.fileId,
    grantor_id: grantorId,
    grantee_id: body.granteeId,
    action: 'grant_access',
    metadata: {
      expires_at: expiresAt,
      access_level: body.accessLevel || 'read',
      notes: body.notes
    }
  });

  return new Response(JSON.stringify({
    ...savedPermission,
    message: 'Access granted successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 201
  });
}

async function validateFileOwnership(fileId: string, ownerId: string) {
  const { data: file, error: fileError } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .eq('owner_id', ownerId)
    .single();

  if (fileError || !file) {
    throw new Error('File not found or access denied');
  }

  return file;
}

async function validateGrantee(granteeId: string) {
  const { data: grantee, error: granteeError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', granteeId)
    .single();

  if (granteeError || !grantee) {
    throw new Error('Grantee not found');
  }

  if (grantee.subscription_tier !== 'F2') {
    throw new Error('Can only grant access to F2 users');
  }

  return grantee;
}

async function checkExistingPermissions(fileId: string, granteeId: string) {
  const { data: existingPermission } = await supabase
    .from('file_permissions')
    .select()
    .eq('file_id', fileId)
    .eq('grantee_id', granteeId)
    .eq('status', 'active')
    .single();

  if (existingPermission) {
    throw new Error('Access already granted to this user');
  }
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed',
      code: 'MethodNotAllowed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    return await handleGrantAccess(req);
  } catch (error) {
    // Log the error
    try {
      await supabase.from('error_logs').insert({
        error_type: 'grant_access_failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          request_url: req.url,
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof Error && 
      (message.includes('limit exceeded') || 
       message.includes('access denied') ||
       message.includes('already granted')) ? 400 : 500;

    return new Response(JSON.stringify({ 
      error: message,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode
    });
  }
};