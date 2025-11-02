import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

async function handleDelete(req: Request, context: AuthContext): Promise<Response> {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const { supabase, user } = context;

  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Extract file id from URL: /api/files/:id
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const fileId = segments[segments.length - 1];
  if (!fileId) {
    throw new Error('Missing file id');
  }

  // Fetch file metadata
  const { data: file, error: fileError } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single();

  if (fileError || !file) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    });
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'User profile not found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    });
  }

  // Only owner can delete
  if (file.owner_id !== profile.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 403
    });
  }

  // Delete from Supabase storage (best-effort)
  try {
    await supabase.storage
      .from('encrypted-files')
      .remove([file.storage_path]);
  } catch (e) {
    // ignore storage delete failures
    console.error('Failed to delete from storage:', e);
  }

  // Delete associated permissions and the file
  try {
    // Delete permissions first (cascade should handle this but being explicit)
    const { data: permissions } = await supabase
      .from('file_permissions')
      .select('id')
      .eq('file_id', fileId);
    
    if (permissions && permissions.length > 0) {
      for (const perm of permissions) {
        await supabase.from('file_permissions').delete().eq('id', perm.id);
      }
    }

    // Delete the file
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      throw deleteError;
    }
  } catch (deleteErr) {
    console.error('Failed to delete file:', deleteErr);
    return new Response(JSON.stringify({ error: 'Failed to delete file' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200
  });
}

export async function onRequest(req: Request, context: AuthContext): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed', code: 'MethodNotAllowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  return withAuth(req, context, handleDelete);
}
