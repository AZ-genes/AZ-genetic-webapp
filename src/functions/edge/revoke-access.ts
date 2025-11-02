import { FilePermission } from './types';
import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

interface RevokeAccessRequest {
  fileId: string;
  granteeId: string;
  reason?: string;
}

async function notifyRevocation(
  supabase: AuthContext['supabase'],
  granteeId: string,
  fileMetadata: any,
  granterId: string,
  reason?: string
) {
  try {
    const { data: grantee } = await supabase
      .from('user_profiles')
      .select('email, notification_preferences')
      .eq('id', granteeId)
      .single();

    if (grantee?.email) {
      // In production, implement proper email notification system
      console.log(`Would send email to ${grantee.email} about access revocation`);
    }

    await supabase.from('notifications').insert({
      user_id: granteeId,
      type: 'access_revoked',
      message: `Your access to file: ${fileMetadata.file_name} has been revoked`,
      metadata: {
        file_id: fileMetadata.id,
        revoked_by: granterId,
        reason
      }
    });
  } catch (error) {
    console.error('Failed to send revocation notification:', error);
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

async function validateActivePermission(
  supabase: AuthContext['supabase'],
  fileId: string,
  granteeId: string
): Promise<FilePermission> {
  const { data: permission, error: permissionError } = await supabase
    .from('file_permissions')
    .select('*')
    .eq('file_id', fileId)
    .eq('grantee_id', granteeId)
    .eq('status', 'active')
    .single();

  if (permissionError || !permission) {
    throw new Error('No active permission found for this user');
  }

  return permission;
}

async function validateRequestBody(req: Request): Promise<RevokeAccessRequest> {
  const body = await req.json() as RevokeAccessRequest;
  if (!body.fileId || !body.granteeId) {
    throw new Error('Missing required fields: fileId, granteeId');
  }
  return body;
}

async function handleRevokeAccess(req: Request, context: AuthContext): Promise<Response> {
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
      throw new Error('Only F1 users can revoke access');
    }

    const body = await validateRequestBody(req);
    const file = await validateFileOwnership(context.supabase, body.fileId, profile.id);
    const permission = await validateActivePermission(context.supabase, body.fileId, body.granteeId);

    // Update permission status
    const { error: updateError } = await context.supabase
      .from('file_permissions')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_by: profile.id,
        revocation_reason: body.reason || null,
        revocation_transaction_id: `mock-tx-${Date.now()}` // Mock for now - can add Hedera later
      })
      .eq('id', permission.id);

    if (updateError) {
      throw updateError;
    }

    // Log the revocation
    await context.supabase.from('access_logs').insert({
      file_id: body.fileId,
      grantor_id: profile.id,
      grantee_id: body.granteeId,
      action: 'revoke_access',
      metadata: {
        reason: body.reason,
        permission_id: permission.id,
        revocation_transaction_id: `mock-tx-${Date.now()}`
      }
    });

    // Notify user of revocation (non-blocking)
    notifyRevocation(
      context.supabase,
      body.granteeId,
      file,
      profile.id,
      body.reason
    ).catch(console.error);

    return new Response(JSON.stringify({
      message: 'Access revoked successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    // Log the error
    try {
      await context.supabase.from('error_logs').insert({
        error_type: 'revoke_access_failed',
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
    return await withAuth(req, context, handleRevokeAccess);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof Error &&
      (message.includes('access denied') ||
        message.includes('not found') ||
        message.includes('Invalid')) ? 400 : 500;

    return new Response(JSON.stringify({
      error: message,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode
    });
  }
}