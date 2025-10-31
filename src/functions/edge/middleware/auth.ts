import { adminAuth, adminFirestore } from '../../../lib/firebaseAdmin';
import { storageAdapter } from '../../../lib/storageAdapter';
import { AuthContext, EdgeFunctionConfig, getEdgeConfig, corsHeaders, createTestClient } from '../utils';

// Import mock verification only in test mode to avoid bundling test code
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
      if (!context.firestore || !context.storage) {
        const testClient = createTestClient();
        context.firestore = testClient.firestore;
        context.storage = testClient.storage;
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
        if (token === 'valid-token') {
          context.user = { uid: 'test-user-id', email: 'test@example.com' };
        } else {
          throw new Error('Test token validation failed: Invalid or expired token');
        }
      } else {
        // Firebase Admin auth verification
        const decodedToken = await adminAuth.verifyIdToken(token);
        context.user = { ...decodedToken, id: decodedToken.uid };
        // Attach Admin Firestore and Storage adapter if not present
        context.firestore = context.firestore || adminFirestore;
        context.storage = context.storage || storageAdapter;
      }

      // Call the handler with auth context
      return await handler(req, { ...context, user: context.user });

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
}