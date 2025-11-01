import { AuthContext, corsHeaders } from './utils';
import { withAuth } from './middleware/auth';

export async function onRequest(req: Request, context: AuthContext): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
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
        // Get name from request body if provided (from sign-up)
        let profileName = null;
        try {
          const body = await req.json().catch(() => ({}));
          profileName = body.name || null;
        } catch {
          // Request body might not be available or already consumed
        }
        
        const newProfile: any = {
          auth_id: user.uid,
          subscription_tier: 'F1',
          email: user.email || null,
        };
        
        if (profileName) {
          newProfile.name = profileName;
        }
        
        await profileRef.set(newProfile);

        // Return profile with document ID
        return new Response(JSON.stringify({
          ...newProfile,
          id: profileRef.id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      }

      // Return profile with document ID
      const profileData = profileDoc.data();
      return new Response(JSON.stringify({
        ...profileData,
        id: profileDoc.id
      }), {
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