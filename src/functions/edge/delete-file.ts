import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

async function handleDelete(req: Request, context: AuthContext): Promise<Response> {
  if (!context.user) {
    throw new Error('User not authenticated');
  }

  const { firestore, storage, user } = context;

  // Extract file id from URL: /api/files/:id
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const fileId = segments[segments.length - 1];
  if (!fileId) {
    throw new Error('Missing file id');
  }

  // Fetch file metadata
  const fileRef = firestore.collection('files').doc(fileId);
  const fileDoc = await fileRef.get();
  if (!fileDoc.exists) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    });
  }

  const file = fileDoc.data();

  // Only owner can delete
  if (file.owner_id !== user.uid && file.owner_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 403
    });
  }

  // Delete from storage (best-effort)
  try {
    const ref = storage.ref(file.storage_path);
    await storage.deleteObject(ref);
  } catch (e) {
    // ignore storage delete failures
  }

  // Delete associated permissions and logs (best-effort batched deletes)
  try {
    const permsSnap = await firestore.collection('file_permissions').where('file_id', '==', fileId).get();
    const batch = firestore.batch();
    permsSnap.forEach((doc: any) => batch.delete(firestore.collection('file_permissions').doc(doc.id)));
    batch.delete(fileRef);
    await batch.commit();
  } catch {
    // fallback: delete file doc
    await fileRef.delete();
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


