import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

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
    return await withAuth(req, context, async (req, context) => {
      const { user, firestore } = context;

      if (!user) {
        throw new Error('User not authenticated');
      }

      const profileRef = firestore.collection('user_profiles').doc(user.uid);
      const profileDoc = await profileRef.get();

      if (!profileDoc.exists) {
        const newProfile = {
          auth_id: user.uid,
          subscription_tier: 'F1'
        };
        await profileRef.set(newProfile);

        return new Response(JSON.stringify(newProfile), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      }

      return new Response(JSON.stringify(profileDoc.data()), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}