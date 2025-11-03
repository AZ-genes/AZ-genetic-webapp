import { createClient } from '@supabase/supabase-js';
import { adminAuth } from '../../../../lib/firebaseAdmin';
import { AuthContext, EdgeFunctionConfig, getEdgeConfig, corsHeaders, createTestClient } from '../utils';

// Import mock verification only in test mode to avoid bundling test code
const verifyMockToken = process.env.NODE_ENV === 'test'
  ? require('../../../tests/mocks/supabase').verifyMockToken
  : null;

export async function withAuth(
  req: Request,
  context: AuthContext,
  handler: (req: Request, context: AuthContext) => Promise<Response>
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const config: EdgeFunctionConfig = getEdgeConfig();
    
    // In test mode, we can bypass auth entirely
    if (config.skipAuth) {
      if (!context.supabase) {
        context.supabase = createTestClient();
      }
      return await handler(req, context);
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    const token = authHeader.replace('Bearer ', '');

    try {
      // In test mode, use mock verification with enhanced error handling
      if (process.env.NODE_ENV === 'test') {
        const mockUser = verifyMockToken(token);
        if (!mockUser) {
          throw new Error('Test token validation failed: Invalid or expired token');
        }
        if (!mockUser.id) {
          throw new Error('Test token validation failed: Missing user ID');
        }
        context.user = {
          id: mockUser.id,
          email: mockUser.email,
          user_metadata: mockUser.user_metadata || {},
          app_metadata: mockUser.app_metadata || {},
          created_at: mockUser.created_at || new Date().toISOString()
        };
      } else {
        // Try Firebase Admin verification first (since that's what's configured)
        try {
          const decodedToken = await adminAuth.verifyIdToken(token);
          context.user = {
            id: decodedToken.uid,
            email: decodedToken.email,
            uid: decodedToken.uid
          };
        } catch (firebaseError) {
          // Fallback to Supabase auth if Firebase verification fails
          if (context.supabase) {
            const { data: { user }, error: userError } = await context.supabase.auth.getUser(token);
            if (userError) {
              throw new Error(`Token validation failed: ${userError.message}`);
            }
            if (!user) {
              throw new Error('Token validation failed: No user found');
            }
            context.user = user;
          } else {
            throw new Error('No authentication provider configured');
          }
        }
      }

      // Call the handler with auth context
      return await handler(req, context);

    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      const isAuthError = error.message.toLowerCase().includes('token') || 
                         error.message.toLowerCase().includes('auth') ||
                         error.message.toLowerCase().includes('unauthorized');
      
      console.error('Auth Error:', error.message);
      
      return new Response(
        JSON.stringify({ 
          error: error.message,
          code: isAuthError ? 'AUTH_ERROR' : 'REQUEST_ERROR'
        }),
        {
          status: isAuthError ? 401 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Unexpected auth error:', error.message);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        code: 'UNEXPECTED_ERROR'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}