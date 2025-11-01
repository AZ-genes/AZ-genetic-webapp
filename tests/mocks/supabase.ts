import { createClient } from '@supabase/supabase-js';
import { vi } from 'vitest';

// In-memory storage for test data
const testData: {
  users: Map<string, any>;
  profiles: Map<string, any>;
  sessions: Map<string, string>;
  filtered?: any[];
} = {
  users: new Map<string, any>(),
  profiles: new Map<string, any>(),
  // Map auth tokens to user IDs
  sessions: new Map<string, string>(),
  filtered: undefined
};

// Mock token generator
function generateMockToken() {
  return `test.${Math.random().toString(36).substring(2)}.${Date.now()}`;
}

// Mock user generator
function generateUserId() {
  return `test-${Math.random().toString(36).substring(2)}`;
}

interface MockResponse<T> {
  data: T;
  error: null | Error;
}

interface MockQueryBuilder<T> {
  select: (columns?: string) => MockQueryBuilder<T>;
  insert: (data: Partial<T>) => MockQueryBuilder<T>;
  delete: () => MockQueryBuilder<T>;
  eq: (column: string, value: any) => MockQueryBuilder<T>;
  single: () => Promise<MockResponse<T>>;
}

// Mock Supabase client factory
export function createMockSupabaseClient() {
  return {
    auth: {
      signUp: vi.fn(async ({ email, password, options }) => {
        const userId = generateUserId();
        const user = {
          id: userId,
          email,
          user_metadata: options?.data || {},
          email_confirmed_at: new Date().toISOString()
        };
        testData.users.set(userId, user);
        return { data: { user }, error: null };
      }),

      signInWithPassword: vi.fn(async ({ email, password }) => {
        const user = Array.from(testData.users.values()).find(u => u.email === email);
        if (!user) {
          return { data: null, error: { message: 'Invalid credentials' } };
        }
        // Create a self-contained token that encodes the user payload so the mock API server
        // can verify tokens without sharing in-memory state across worker processes.
        const payload = Buffer.from(JSON.stringify({ id: user.id, email: user.email, user_metadata: user.user_metadata })).toString('base64');
        const token = `mock.${payload}`;
        // keep sessions map for compatibility when running in single-process mode
        testData.sessions.set(token, user.id);
        return {
          data: {
            session: {
              access_token: token,
              user
            }
          },
          error: null
        };
      }),

      getUser: vi.fn(async () => {
        // This would normally use the current session - for tests we'll return the last created user
        const lastUser = Array.from(testData.users.values()).pop();
        return { data: { user: lastUser }, error: null };
      })
    },

    from: (table: string): MockQueryBuilder<any> => {
      const builder: MockQueryBuilder<any> = {
        select: (columns?: string) => builder,
        insert: (data: any) => {
          if (table === 'user_profiles') {
            const profile = {
              id: generateUserId(),
              ...data,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            testData.profiles.set(profile.id, profile);
          }
          return builder;
        },
        delete: () => builder,
        eq: (column: string, value: any) => builder,
        single: async () => {
          if (table === 'user_profiles') {
            const profiles = Array.from(testData.profiles.values());
            return { data: profiles[0], error: null };
          }
          return { data: null, error: new Error(`Table ${table} not mocked`) };
        }
      };
      return builder;
    }
  };
}

// Mock admin client with additional capabilities
export function createMockSupabaseAdminClient() {
  return {
    auth: {
      admin: {
        createUser: vi.fn(async ({ email, password, email_confirm, user_metadata }) => {
          const userId = generateUserId();
          const user = {
            id: userId,
            email,
            user_metadata,
            email_confirmed_at: email_confirm ? new Date().toISOString() : null
          };
          testData.users.set(userId, user);
          return { data: { user }, error: null };
        }),
        deleteUser: vi.fn(async (userId: string) => {
          testData.users.delete(userId);
          return { error: null };
        }),
        updateUserById: vi.fn(async (userId: string, updates: any) => {
          const user = testData.users.get(userId);
          if (user) {
            testData.users.set(userId, { ...user, ...updates });
          }
          return { error: null };
        })
      }
    },
    from: (table: string): MockQueryBuilder<any> => {
      const builder: MockQueryBuilder<any> = {
        select: (columns?: string) => builder,
        insert: (data: any) => {
          if (table === 'user_profiles') {
            const profile = {
              id: generateUserId(),
              ...data,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            testData.profiles.set(profile.id, profile);
          }
          return builder;
        },
        delete: () => builder,
        eq: (column: string, value: any) => {
          // For eq operations, we should filter based on the column and value
          if (table === 'user_profiles' && column === 'auth_id') {
            const filtered = Array.from(testData.profiles.values()).filter(p => p.auth_id === value);
            testData.filtered = filtered; // Store filtered results for use in single()
          }
          return builder;
        },
        single: async () => {
          if (table === 'user_profiles') {
            const profiles = testData.filtered || Array.from(testData.profiles.values());
            testData.filtered = undefined; // Clear filtered results
            if (profiles.length === 0) {
              return { data: null, error: new Error('No matching record found') };
            }
            return { data: profiles[0], error: null };
          }
          return { data: null, error: new Error(`Table ${table} not mocked`) };
        }
      };
      return builder;
    }
  };
}

// Utility to verify a mock token
export function verifyMockToken(token: string) {
  try {
    if (!token) return null;
    if (token.startsWith('mock.')) {
      const b = token.split('.', 2)[1];
      const decoded = JSON.parse(Buffer.from(b, 'base64').toString('utf8'));
      return decoded;
    }
  } catch (err) {
    return null;
  }
  // Fallback for older token formats that were stored in sessions map
  const userId = testData.sessions.get(token);
  if (!userId) return null;
  return testData.users.get(userId);
}

// Helper to find a user id by subscription tier (used by mock API server)
export function findUserIdByTier(tier: string) {
  for (const [id, user] of testData.users.entries()) {
    if (user?.user_metadata?.subscription_tier === tier) return id;
  }
  return null;
}

// Given a profile id, return the linked auth user id (auth_id) if present
export function findAuthIdByProfileId(profileId: string) {
  const profile = testData.profiles.get(profileId);
  return profile?.auth_id ?? null;
}

// Reset test data between tests
export function clearMockData() {
  testData.users.clear();
  testData.profiles.clear();
  testData.sessions.clear();
}