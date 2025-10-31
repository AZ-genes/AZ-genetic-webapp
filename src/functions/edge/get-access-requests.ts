import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

async function handleGetAccessRequests(req: Request, context: AuthContext): Promise<Response> {
  if (req.method !== 'GET') {
    throw new Error('Method not allowed');
  }

  try {
    const { user, firestore } = context;

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get file permissions where the current user is the grantee (i.e., requests made to their files)
    const permissionsSnapshot = await firestore.collection('file_permissions')
      .where('grantee_id', '==', user.uid)
      .where('status', '==', 'pending') // Only show pending requests for now
      .get();

    const accessRequests: any[] = [];
    for (const doc of permissionsSnapshot.docs) {
      const permission = doc.data();
      const fileSnapshot = await firestore.collection('files').doc(permission.file_id).get();
      if (fileSnapshot.exists) {
        accessRequests.push({
          id: doc.id,
          file_id: fileSnapshot.id,
          file_name: fileSnapshot.data().file_name,
          owner_id: permission.owner_id,
          access_type: permission.access_type,
          request_date: new Date(permission.created_at).toLocaleDateString(),
          status: permission.status,
          ...permission,
        });
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
