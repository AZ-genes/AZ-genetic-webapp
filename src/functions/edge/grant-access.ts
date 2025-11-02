import { FilePermission } from './types';
import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

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

async function notifyGrantee(
  supabase: AuthContext['supabase'], 
  granteeId: string, 
  fileMetadata: any, 
  granterId: string
) {
  try {
    const { data: grantee } = await supabase
      .from('user_profiles')
      .select('email, notification_preferences')
      .eq('id', granteeId)
      .single();

    if (grantee?.email) {
      // In production, implement proper email notification system
      console.log(`Would send email to ${grantee.email} about new file access`);
    }

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
  }
}

async function validateFileOwnership(
  supabase: AuthContext['supabase'],
  fileId: string, 
  ownerId: string
) {
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

async function validateGrantee(
  supabase: AuthContext['supabase'],
  granteeId: string
) {
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

async function checkExistingPermissions(
  supabase: AuthContext['supabase'],
  fileId: string, 
  granteeId: string
) {
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

async function validateAndGetProfile(context: AuthContext) {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const { data: profile, error: profileError } = await context.supabase
    .from('user_profiles')
    .select()
    .eq('auth_id', context.user.id)
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
  const body = await req.json() as GrantAccessRequest;
  if (!body.fileId || !body.granteeId) {
    throw new Error('Missing required fields: fileId, granteeId');
  }

  if (body.accessLevel && !['read', 'read_write'].includes(body.accessLevel)) {
    throw new Error('Invalid access level. Must be "read" or "read_write"');
  }

  return body;
}

async function handleGrantAccess(req: Request, context: AuthContext): Promise<Response> {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  try {
    // Get user profile
    const { data: profile, error: profileError } = await context.supabase
      .from('user_profiles')
      .select()
      .eq('auth_id', context.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    if (profile.subscription_tier !== 'F1') {
      throw new Error('Only F1 users can grant access');
    }

    const body = await validateRequestBody(req);
    const file = await validateFileOwnership(context.supabase, body.fileId, profile.id);
    await validateGrantee(context.supabase, body.granteeId);
    
    if (!checkRateLimit(profile.id)) {
      throw new Error(`Grant limit exceeded. Maximum ${MAX_GRANTS_PER_DAY} grants per day.`);
    }

    await checkExistingPermissions(context.supabase, body.fileId, body.granteeId);
    const expiresAt = await validateExpiryDate(body.expiresAt);

    const permission: Partial<ExtendedPermission> = {
      file_id: body.fileId,
      grantee_id: body.granteeId,
      granted_by: profile.id,
      hedera_transaction_id: `mock-tx-${Date.now()}`, // Mock for now - can add Hedera later
      expires_at: expiresAt,
      access_level: body.accessLevel || 'read',
      status: 'active'
    };

    const { data: savedPermission, error: saveError } = await context.supabase
      .from('file_permissions')
      .insert(permission)
      .select()
      .single();

    if (saveError) {
      throw saveError;
    }

    await context.supabase.from('access_logs').insert({
      file_id: body.fileId,
      grantor_id: profile.id,
      grantee_id: body.granteeId,
      action: 'grant_access',
      metadata: {
        expires_at: expiresAt,
        access_level: body.accessLevel || 'read',
        notes: body.notes
      }
    });

    // Notify grantee (non-blocking)
    notifyGrantee(context.supabase, body.granteeId, file, profile.id).catch(console.error);

    return new Response(JSON.stringify({
      ...savedPermission,
      message: 'Access granted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201
    });

  } catch (error) {
    // Log the error
    try {
      await context.supabase.from('error_logs').insert({
        error_type: 'grant_access_failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          request_url: req.url,
          timestamp: new Date().toISOString(),
          user_id: context.user.id
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    throw error;
  }
}

export async function onRequest(req: Request, context: AuthContext): Promise<Response> {
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
    return await withAuth(req, context, handleGrantAccess);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof Error && 
      (message.includes('limit exceeded') || 
       message.includes('access denied') ||
       message.includes('already granted') ||
       message.includes('Invalid') ||
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