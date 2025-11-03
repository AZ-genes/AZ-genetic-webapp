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
      const { user, supabase } = context;

      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (!existingProfile) {
        // Get name and user_role from request body if provided (from sign-up)
        let profileName = null;
        let userRole = 'patient'; // default role
        try {
          const body = await req.json().catch(() => ({}));
          profileName = body.name || null;
          userRole = body.user_role || 'patient';
        } catch {
          // Request body might not be available or already consumed
        }
        
        const newProfile: any = {
          auth_id: user.id,
          subscription_tier: 'F1',
          email: user.email || null,
          user_role: userRole,
        };
        
        if (profileName) {
          newProfile.name = profileName;
        }
        
        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          throw new Error(`Failed to create profile: ${createError.message}`);
        }

        return new Response(JSON.stringify(createdProfile), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      }

      // Return existing profile
      return new Response(JSON.stringify(existingProfile), {
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