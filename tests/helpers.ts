import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startMockApiServer, stopMockApiServer } from './mockServer';
import { auth } from '../lib/firebase';

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

// Reset mock data once and start mock server. We avoid clearing repeatedly because Vitest
// may run multiple test files in the same worker and clearing in each file would
// remove sessions created by other suites.
let __helpersInitialized = false;

// Setup before all tests
beforeAll(async () => {
  if (!__helpersInitialized) {
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
  // In a real Firebase environment, you would use the Firebase Admin SDK to create users.
  // For this mock setup, we'll just return a mock user object.
  const authId = `test-auth-id-${userConfig.tier}`;
  const userId = `test-user-id-${userConfig.tier}`;
  return {
    token: 'valid-token',
    userId,
    authId
  };
}

export async function cleanupTestUser(authId: string) {
  // In a real Firebase environment, you would use the Firebase Admin SDK to delete users.
  // For this mock setup, we don't need to do anything.
}

let cachedUsers: Record<string, { token: string; userId: string; authId: string }> | null = null;

export async function setupTestEnv() {
  // Return cached users if they exist
  if (cachedUsers) {
    return cachedUsers;
  }

  // Create new users if cache is invalid or doesn't exist
  console.log('Creating new test users...');
  const users: Record<string, { token: string; userId: string; authId: string }> = {};

  for (const [key, config] of Object.entries(testUsers)) {
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