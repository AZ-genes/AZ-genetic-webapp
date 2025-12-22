export interface AuthContext {
  user?: any;
  supabase?: any;
}

export interface EdgeFunctionConfig {
  isTestMode: boolean;
  skipAuth: boolean;
}

// Helper to check if we're in test mode and should bypass real auth
export function getEdgeConfig(): EdgeFunctionConfig {
  const isTestMode = process.env.NODE_ENV === 'test';
  const skipAuth = isTestMode && process.env.SKIP_AUTH_IN_TEST === 'true';

  return {
    isTestMode,
    skipAuth
  };
}

// Helper to create a mock Supabase client for test mode
export function createTestClient() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('createTestClient should only be called in test mode');
  }

  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        },
        error: null
      })
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              id: 'test-profile-id',
              auth_id: 'test-user-id',
              subscription_tier: 'F1'
            },
            error: null
          })
        })
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => Promise.resolve({
            data: { ...data, id: 'test-file-id' },
            error: null
          })
        })
      }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null })
    }),
    storage: {
      from: (bucket: string) => ({
        upload: () => Promise.resolve({ data: { path: 'test-path' }, error: null }),
        remove: () => Promise.resolve({ data: null, error: null })
      })
    }
  };
}

// CORS headers used across edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};