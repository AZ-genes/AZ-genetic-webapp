import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

async function handleGetUserRecord(req: Request, context: AuthContext): Promise<Response> {
  if (req.method !== 'GET') {
    throw new Error('Method not allowed');
  }

  try {
    const { firestore } = context;
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || context.user.uid;

    // Verify user has permission (own data or authorized access)
    if (userId !== context.user.uid) {
      // Check if user has been granted access
      const accessCheck = await firestore
        .collection('file_permissions')
        .where('grantee_id', '==', context.user.uid)
        .where('file_owner_id', '==', userId)
        .get();

      if (accessCheck.empty) {
        throw new Error('Unauthorized access');
      }
    }

    // Get latest health record hash from operations database
    const filesRef = firestore.collection('files').where('owner_id', '==', userId);
    const filesSnapshot = await filesRef.get();

    if (filesSnapshot.empty) {
      return new Response(JSON.stringify({
        userId,
        records: [],
        latest_hash: null,
        latest_tx_id: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Get all user files with metadata
    const records = filesSnapshot.docs.map((doc: any) => ({
      file_id: doc.id,
      file_name: doc.data().file_name,
      file_type: doc.data().file_type,
      storage_path: doc.data().storage_path,
      hedera_transaction_id: doc.data().hedera_transaction_id,
      hash: doc.data().hash,
      created_at: doc.data().created_at || null
    }));

    // Find the most recent transaction
    const latestRecord = records.sort((a: any, b: any) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    })[0];

    return new Response(JSON.stringify({
      userId,
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

