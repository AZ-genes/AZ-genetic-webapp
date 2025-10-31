export interface AuthContext {
  user?: any;
  auth: any;
  firestore: any;
  storage: any;
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

// Helper to create a mock Firebase client for test mode
export function createTestClient() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('createTestClient should only be called in test mode');
  }

  const firestoreMock = {
    collection: (path: string) => ({
      doc: (docPath: string) => ({
        get: async () => ({ exists: true, data: () => ({ id: docPath }) }),
        set: async (data: any) => ({}),
        delete: async () => ({}),
      }),
      add: async (data: any) => ({ id: 'test-doc-id' }),
    }),
  };

  const storageMock = {
    ref: (path: string) => ({
      getDownloadURL: async () => 'https://fake-url.com/test-path',
      delete: async () => ({}),
    }),
    uploadBytes: async (ref: any, data: any) => ({ metadata: { fullPath: 'test-path' } }),
  };

  return {
    auth: {
      verifyIdToken: async (token: string) => {
        if (token === 'valid-token') {
          return { uid: 'test-user-id', email: 'test@example.com' };
        }
        throw new Error('Invalid token');
      }
    },
    firestore: firestoreMock,
    storage: storageMock,
  };
}

// CORS headers used across edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};