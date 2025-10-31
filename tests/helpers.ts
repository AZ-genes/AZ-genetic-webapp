import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startMockApiServer, stopMockApiServer } from './mockServer';
import { auth } from '../lib/firebase';
import { createTestClient } from '../src/functions/edge/utils'; // Import createTestClient

// ... (rest of the file)

// Reset mocks between each test
beforeEach(() => {
  // Reset mock call counters but keep user data
  vi.clearAllMocks();
  createTestClient().reset(); // Reset mock Firestore data for each test
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
    token: `${userConfig.tier.toLowerCase()}-token`,
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