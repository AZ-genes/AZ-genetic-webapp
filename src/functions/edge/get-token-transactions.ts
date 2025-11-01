import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

async function handleGetTokenTransactions(req: Request, context: AuthContext): Promise<Response> {
  if (req.method !== 'GET') {
    throw new Error('Method not allowed');
  }

  try {
    const { user, firestore } = context;

    if (!user) {
      throw new Error('User not authenticated');
    }

    if (!firestore || typeof firestore.collection !== 'function') {
      throw new Error('Firestore is not properly initialized. Please check Firebase Admin configuration.');
    }

    // Get user profile to use profile.id
    const profileRef = firestore.collection('user_profiles').doc(user.uid);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      // Return empty array if profile doesn't exist yet
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Profile ID is the Firestore document ID
    const profileId = profileDoc.id;

    // Query transactions where user is sender or recipient
    // Use simpler queries without orderBy to avoid index requirement, then sort in memory
    const sentTransactionsRef = firestore.collection('token_transactions')
      .where('sender_id', '==', profileId);
    
    const receivedTransactionsRef = firestore.collection('token_transactions')
      .where('recipient_id', '==', profileId);

    const [sentSnapshot, receivedSnapshot] = await Promise.all([
      sentTransactionsRef.get(),
      receivedTransactionsRef.get()
    ]);

    // Combine and sort transactions in memory (avoids need for composite index)
    const allTransactions = [
      ...sentSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        type: 'spent' as const
      })),
      ...receivedSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        type: 'received' as const
      }))
    ].sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime; // Descending order (newest first)
    });

    return new Response(JSON.stringify(allTransactions), {
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
    return await withAuth(req, context, handleGetTokenTransactions);
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
