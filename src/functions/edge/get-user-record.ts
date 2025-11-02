import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

async function handleGetUserRecord(req: Request, context: AuthContext): Promise<Response> {
  if (req.method !== 'GET') {
    throw new Error('Method not allowed');
  }

  try {
    const { user, supabase } = context;

    if (!user) {
      throw new Error('User not authenticated');
    }

    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const url = new URL(req.url);
    const requestedUserId = url.searchParams.get('userId') || user.id;

    // Verify user has permission (own data or authorized access)
    if (requestedUserId !== user.id) {
      // Get current user's profile
      const { data: currentProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!currentProfile) {
        throw new Error('User profile not found');
      }

      // Check if user has been granted access to the requested user's files
      const { data: accessCheck } = await supabase
        .from('file_permissions')
        .select('*')
        .eq('grantee_id', currentProfile.id)
        .limit(1);

      // If requesting another user's data, require explicit permission
      const { data: requestedProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_id', requestedUserId)
        .single();

      if (!requestedProfile || requestedProfile.id !== currentProfile.id) {
        // Check if there's any permission linking them
        const hasPermission = accessCheck && accessCheck.length > 0;
        if (!hasPermission) {
          throw new Error('Unauthorized access');
        }
      }
    }

    // Get target user's profile
    const { data: targetProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_id', requestedUserId)
      .single();

    if (profileError || !targetProfile) {
      // Return empty response if profile doesn't exist
      return new Response(JSON.stringify({
        userId: requestedUserId,
        records: [],
        latest_hash: null,
        latest_tx_id: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Get files for this profile
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('owner_id', targetProfile.id)
      .order('created_at', { ascending: false });

    if (filesError) {
      throw new Error('Failed to fetch files');
    }

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({
        userId: requestedUserId,
        records: [],
        latest_hash: null,
        latest_tx_id: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Get all user files with metadata
    const records = files.map((file: any) => ({
      file_id: file.id,
      file_name: file.file_name,
      file_type: file.file_type,
      storage_path: file.storage_path,
      hedera_transaction_id: file.hedera_transaction_id,
      hash: file.hash,
      created_at: file.created_at || null
    }));

    // Find the most recent transaction
    const latestRecord = records.sort((a: any, b: any) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    })[0];

    return new Response(JSON.stringify({
      userId: requestedUserId,
      records,
      latest_hash: latestRecord?.hash || null,
      latest_tx_id: latestRecord?.hedera_transaction_id || null,
      total_records: records.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = message.includes('Unauthorized') ? 403 : 500;

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
    return await withAuth(req, context, handleGetUserRecord);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = message.includes('Unauthorized') ? 403 : 500;

    return new Response(JSON.stringify({ 
      error: message,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode
    });
  }
}
