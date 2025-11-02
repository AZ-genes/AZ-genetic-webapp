import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

async function handleGetTokenTransactions(req: Request, context: AuthContext): Promise<Response> {
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
      // Return empty array if profile doesn't exist yet
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Query transactions where user is sender or recipient
    // Supabase doesn't have a great .or() syntax, so we'll fetch both and combine
    const { data: sentTransactions, error: sentError } = await supabase
      .from('token_transactions')
      .select('*')
      .eq('sender_id', profile.id);

    const { data: receivedTransactions, error: receivedError } = await supabase
      .from('token_transactions')
      .select('*')
      .eq('recipient_id', profile.id);

    // Handle errors
    if (sentError || receivedError) {
      console.error('Error fetching transactions:', sentError || receivedError);
      // Return empty array on error
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Combine and sort transactions in memory
    const allTransactions = [
      ...(sentTransactions || []).map((tx: any) => ({
        id: tx.id,
        ...tx,
        type: 'spent' as const
      })),
      ...(receivedTransactions || []).map((tx: any) => ({
        id: tx.id,
        ...tx,
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
