import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

async function handleGetSharedFiles(req: Request, context: AuthContext): Promise<Response> {
  if (req.method !== 'GET') {
    throw new Error('Method not allowed');
  }

  try {
    const { user, firestore } = context;

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get file permissions where the current user is the owner
    const permissionsSnapshot = await firestore.collection('file_permissions')
      .where('owner_id', '==', user.uid)
      .where('status', '==', 'active')
      .get();

    const sharedFiles: any[] = [];
    for (const doc of permissionsSnapshot.docs) {
      const permission = doc.data();
      const fileSnapshot = await firestore.collection('files').doc(permission.file_id).get();
      if (fileSnapshot.exists) {
        sharedFiles.push({
          id: doc.id,
          file_id: fileSnapshot.id,
          file_name: fileSnapshot.data().file_name,
          grantee_id: permission.grantee_id,
          access_type: permission.access_type,
          expires_at: permission.expires_at,
          ...permission,
        });
      }
    }

    return new Response(JSON.stringify(sharedFiles), {
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
    return await withAuth(req, context, handleGetSharedFiles);
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
