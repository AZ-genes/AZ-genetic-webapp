import { HederaClient } from '../../services/hedera/client';
import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

const hederaClient = new HederaClient();

async function handleTransferTokens(req: Request, context: AuthContext): Promise<Response> {
  if (req.method !== 'POST') {
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

    const profileRef = firestore.collection('user_profiles').doc(user.uid);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      throw new Error('User profile not found');
    }
    const profile = profileDoc.data();
    // Profile ID is the Firestore document ID
    const profileId = profileDoc.id;

    const body = await req.json();
    const { recipientAccountId, amount: amountRaw } = body;

    // Convert amount to number if it's a string
    const amount = typeof amountRaw === 'string' ? parseFloat(amountRaw) : Number(amountRaw);

    if (!recipientAccountId || !amount || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid recipient account ID or amount');
    }

    // Perform token transfer using HederaClient
    const transactionId = await hederaClient.transferTokens(profileId, recipientAccountId, amount);

    // Log the transaction
    await firestore.collection('token_transactions').add({
      sender_id: profileId,
      recipient_id: recipientAccountId,
      amount: amount,
      transaction_id: transactionId,
      timestamp: new Date().toISOString(),
      status: 'completed',
    });

    return new Response(JSON.stringify({ transactionId }), {
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
    return await withAuth(req, context, handleTransferTokens);
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
