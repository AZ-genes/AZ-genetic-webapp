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
let _mockData: Record<string, any> = {};

export function createTestClient(initialData: Record<string, any> = {}) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('createTestClient should only be called in test mode');
  }

  _mockData = { ...initialData }; // Initialize or reset mock data

  const firestoreMock = {
    collection: (collectionPath: string) => ({
      doc: (docPath: string) => ({
        get: async () => {
          const fullPath = `${collectionPath}/${docPath}`;
          const data = _mockData[fullPath];
          return {
            exists: !!data,
            data: () => data || {}, // Ensure data() always returns an object
          };
        },
        set: async (data: any) => {
          const fullPath = `${collectionPath}/${docPath}`;
          _mockData[fullPath] = data;
        },
        delete: async () => {
          const fullPath = `${collectionPath}/${docPath}`;
          delete _mockData[fullPath];
        },
      }),
      add: async (data: any) => {
        const newDocId = `test-doc-id-${Date.now()}`;
        const fullPath = `${collectionPath}/${newDocId}`;
        _mockData[fullPath] = { ...data, id: newDocId };
        return { id: newDocId };
      },
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
        if (token === 'f1-token') {
          return { uid: 'test-auth-id-F1', email: 'f1user@example.com', tier: 'F1' };
        } else if (token === 'f2-token') {
          return { uid: 'test-auth-id-F2', email: 'f2user@example.com', tier: 'F2' };
        } else if (token === 'f3-token') {
          return { uid: 'test-auth-id-F3', email: 'f3user@example.com', tier: 'F3' };
        }
        throw new Error('Invalid token');
      },
      currentUser: { // Add a mock currentUser
        uid: 'test-user-id', // This will be overridden by context.user in withAuth
        email: 'test@example.com',
      },
      // Add other commonly used auth methods/properties if needed
    },
    firestore: firestoreMock,
    storage: storageMock,
    reset: (newData: Record<string, any> = {}) => {
      _mockData = { ...newData };
    }
  };


}

// CORS headers used across edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};