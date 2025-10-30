import { verifyMockToken } from '../../tests/mocks/supabase';

export function createMockAuthMiddleware() {
  return async (req: Request) => {
    // Only use mock auth in test mode
    if (process.env.NODE_ENV !== 'test') {
      return null;
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    // Verify the mock token
    const user = verifyMockToken(token);
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Add the verified user to the request context
    (req as any).user = user;
    return null;
  };
}