import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient, createMockSupabaseAdminClient, clearMockData } from './mocks/supabase';
import { startMockApiServer, stopMockApiServer } from './mockServer';

// Environment setup for testing
export function setupTestMode() {
  // For test mode, we'll validate the environment instead of trying to set it
  const required = {
    SKIP_AUTH_IN_TEST: 'true',
    NODE_ENV: 'test'
  };

  let missingEnv = false;
  Object.entries(required).forEach(([key, value]) => {
    if (process.env[key] !== value) {
      console.warn(`Warning: ${key} should be set to "${value}" for offline testing`);
      missingEnv = true;
    }
  });

  if (missingEnv) {
    console.warn('Some required environment variables are not set correctly. Tests may fail.');
  }
}

// Use mock clients for tests
export const supabase = createMockSupabaseClient();
export const supabaseAdmin = createMockSupabaseAdminClient();

// Reset mock data once and start mock server. We avoid clearing repeatedly because Vitest
// may run multiple test files in the same worker and clearing in each file would
// remove sessions created by other suites.
let __helpersInitialized = false;

// Setup before all tests
beforeAll(async () => {
  if (!__helpersInitialized) {
    // Clear all mock data stores
    clearMockData();
    __helpersInitialized = true;

    // Setup test environment
    setupTestMode();
  }

  // Start mock API server for offline testing
  await startMockApiServer(3000);
});

// Reset mocks between each test
beforeEach(() => {
  // Reset mock call counters but keep user data
  vi.clearAllMocks();
});

afterAll(async () => {
  await stopMockApiServer();
});


function uniqueEmail(prefix: string) {
  const timestamp = Date.now();
  const unique = Math.random().toString(36).substring(2, 6);
  // Using example.com which is reserved for testing purposes
  return `test.${prefix}.${timestamp}.${unique}@example.com`;
}

export const testUsers = {
  f1User: {
    email: uniqueEmail('f1user'),
    password: 'TestPassword123!',
    tier: 'F1'
  },
  f2User: {
    email: uniqueEmail('f2user'),
    password: 'TestPassword123!',
    tier: 'F2'
  },
  f3User: {
    email: uniqueEmail('f3user'),
    password: 'TestPassword123!',
    tier: 'F3'
  }
};

export async function setupTestUser(userConfig: typeof testUsers.f1User) {
  // Use the admin API to create the user directly (avoids sending confirmation emails)
  const { data: { user: adminUser }, error: adminCreateError } = await supabaseAdmin.auth.admin.createUser({
    email: userConfig.email,
    password: userConfig.password,
    email_confirm: true,
    user_metadata: {
      subscription_tier: userConfig.tier
    }
  });

  if (adminCreateError) {
    console.error(`Admin create user error for ${userConfig.email}:`, adminCreateError);
    throw adminCreateError;
  }

  console.log(`Setting up user profile for ${userConfig.email}...`);

  // Immediately sign in the newly created admin user to obtain a session token
  const _signInAfterCreate = await supabase.auth.signInWithPassword({
    email: adminUser!.email,
    password: userConfig.password
  });
  const sessionToken = _signInAfterCreate?.data?.session?.access_token ?? null;
  const signInAfterCreateError = _signInAfterCreate?.error ?? null;
  if (signInAfterCreateError || !sessionToken) {
    throw signInAfterCreateError || new Error('Failed to sign in test user after creation');
  }

  // Create user profile with RLS bypassed using service role
  const { data: profileData, error: insertError } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      auth_id: adminUser!.id,
      subscription_tier: userConfig.tier
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Use the session token obtained when signing in the admin user earlier
  return {
    token: sessionToken,
    userId: profileData.id,
    authId: adminUser!.id
  };
}

export async function cleanupTestUser(authId: string) {
  // Delete user profile
  await supabaseAdmin
    .from('user_profiles')
    .delete()
    .eq('auth_id', authId);

  // Delete auth user
  await supabaseAdmin.auth.admin.deleteUser(authId);
}

let cachedUsers: Record<string, { token: string; userId: string; authId: string }> | null = null;

export async function setupTestEnv() {
  // NOTE: do not clear global mock data here - multiple test files may run concurrently
  // and clearing here would remove sessions created by other suites.

  // Return cached users if they exist
  if (cachedUsers) {
    // Verify users still exist by checking the profiles table (avoid relying on token refresh)
    try {
      const verifiedUsers: Record<string, { token: string; userId: string; authId: string }> = {};
      for (const [key, user] of Object.entries(cachedUsers)) {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, auth_id')
          .eq('auth_id', user.authId)
          .single();

        if (!profileError && profile) {
          // keep the cached token; if it expires tests that need a fresh token should sign-in again
          verifiedUsers[key] = user;
        }
      }
      if (Object.keys(verifiedUsers).length === Object.keys(cachedUsers).length) {
        console.log('Using cached test users');
        return verifiedUsers;
      }
    } catch (error) {
      console.log('Failed to use cached users:', error);
    }
  }

  // Create new users if cache is invalid or doesn't exist
  console.log('Creating new test users...');
  const users: Record<string, { token: string; userId: string; authId: string }> = {};

  for (const [key, config] of Object.entries(testUsers)) {
    // Add delay between user creations to avoid rate limits
    if (Object.keys(users).length > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    users[key] = await setupTestUser(config);
  }

  // Cache the new users
  cachedUsers = users;
  return users;
}

export async function cleanupTestEnv(users: Record<string, { authId: string }> | undefined) {
  if (!users) return;
  for (const { authId } of Object.values(users)) {
    if (authId) {
      await cleanupTestUser(authId);
    }
  }
}