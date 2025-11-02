import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

async function handleGetAccessRequests(req: Request, context: AuthContext): Promise<Response> {
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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Get file permissions where the current user is the grantee (i.e., requests made to their files)
    const { data: permissions, error: permissionsError } = await supabase
      .from('file_permissions')
      .select('*')
      .eq('grantee_id', profile.id)
      .eq('status', 'pending'); // Only show pending requests for now

    if (permissionsError) {
      throw new Error('Failed to fetch access requests');
    }

    // Get files for these permissions
    const accessRequests: any[] = [];
    if (permissions && permissions.length > 0) {
      for (const permission of permissions) {
        const { data: file, error: fileError } = await supabase
          .from('files')
          .select('*')
          .eq('id', permission.file_id)
          .single();
        
        if (!fileError && file) {
          accessRequests.push({
            id: permission.id,
            file_id: file.id,
            file_name: file.file_name,
            owner_id: permission.granted_by,
            access_level: permission.access_level,
            request_date: new Date(permission.created_at).toLocaleDateString(),
            status: permission.status,
            ...permission,
          });
        }
      }
    }

    return new Response(JSON.stringify(accessRequests), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: message,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
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
    return await withAuth(req, context, handleGetAccessRequests);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: message,
      code: error instanceof Error ? error.name : 'UnknownError'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}
