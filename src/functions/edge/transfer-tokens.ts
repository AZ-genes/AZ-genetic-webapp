import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

async function handleTransferTokens(req: Request, context: AuthContext): Promise<Response> {
  if (req.method !== 'POST') {
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

    const body = await req.json();
    const { recipientAccountId, amount: amountRaw } = body;

    // Convert amount to number if it's a string
    const amount = typeof amountRaw === 'string' ? parseFloat(amountRaw) : Number(amountRaw);

    if (!recipientAccountId || !amount || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid recipient account ID or amount');
    }

    // Perform token transfer (mock for now - can add Hedera later)
    const transactionId = `mock-transfer-${Date.now()}`;

    // Log the transaction in Supabase
    const { error: insertError } = await supabase
      .from('token_transactions')
      .insert({
        sender_id: profile.id,
        recipient_id: recipientAccountId,
        amount: amount,
        transaction_id: transactionId,
        timestamp: new Date().toISOString(),
        status: 'completed',
      });

    if (insertError) {
      console.error('Failed to log transaction:', insertError);
      // Don't fail the whole request if logging fails
    }

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
