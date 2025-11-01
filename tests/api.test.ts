import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase, supabaseAdmin, testUsers, setupTestEnv, cleanupTestEnv } from './helpers';
import fs from 'fs';
import path from 'path';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Required environment variables are not set');
}

// Using pre-configured test users from helpers

const maybeDescribe = process.env.SKIP_SUPABASE_INTEGRATION === 'true' ? describe.skip : describe;

maybeDescribe('Genetic Data API Tests', () => {
  let f1Token: string;
  let f2Token: string;
  let f3Token: string;
  let uploadedFileId: string;
  let createdUsers: Awaited<ReturnType<typeof setupTestEnv>>;

  // Test invalid auth scenarios
  describe('Authentication', () => {
    it('should reject requests without auth header', async () => {
      const response = await fetch(`${API_BASE_URL}/get-profile`);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('No authorization header');
    });

    it('should reject invalid tokens', async () => {
      const response = await fetch(`${API_BASE_URL}/get-profile`, {
        headers: {
          'Authorization': 'Bearer invalid.token.here'
        }
      });
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Invalid test token');
    });

    it('should reject malformed tokens', async () => {
      const response = await fetch(`${API_BASE_URL}/get-profile`, {
        headers: {
          'Authorization': 'Bearer not-even-a-jwt'
        }
      });
      expect(response.status).toBe(401);
    });
  });

  beforeAll(async () => {
    // Use helper to create users via admin (avoids sending emails and rate limits)
    createdUsers = await setupTestEnv();
    f1Token = createdUsers.f1User.token;
    f2Token = createdUsers.f2User.token;
    f3Token = createdUsers.f3User.token;
  });

  afterAll(async () => {
    // Cleanup test data using helper
    await cleanupTestEnv(createdUsers);
  });

  const API_BASE_URL = 'http://localhost:3000/api';

describe('File Upload Tests', () => {
    it('should allow F1 user to upload a file', async () => {
      const testFilePath = path.join(__dirname, 'fixtures', 'test.vcf');
      const fileContent = await fs.promises.readFile(testFilePath);
      
      const formData = new FormData();
      formData.append('file', new Blob([fileContent], { type: 'chemical/x-vcf' }), 'test.vcf');

      const response = await fetch(`${API_BASE_URL}/upload-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${f1Token}`
        },
        body: formData
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      uploadedFileId = data.id;
      expect(data.file_name).toBe('test.vcf');
    });

    it('should not allow F2 user to upload files', async () => {
      const testFilePath = path.join(__dirname, 'fixtures', 'test.vcf');
      const fileContent = await fs.promises.readFile(testFilePath);
      
      const formData = new FormData();
      formData.append('file', new Blob([fileContent], { type: 'chemical/x-vcf' }), 'test.vcf');

      const response = await fetch(`${API_BASE_URL}/upload-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${f2Token}`
        },
        body: formData
      });

      expect(response.status).toBe(403);
    });
  });

  describe('File Access Tests', () => {
    it('should allow F1 user to grant access to F2 user', async () => {
      const response = await fetch(`${API_BASE_URL}/grant-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${f1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: uploadedFileId,
          granteeId: 'F2_USER_ID', // Replace with actual F2 user ID
          accessLevel: 'read'
        })
      });

      expect(response.status).toBe(201);
    });

    it('should allow F2 user to access granted file', async () => {
      const response = await fetch(`${API_BASE_URL}/get-file?fileId=${uploadedFileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${f2Token}`
        }
      });

      expect(response.status).toBe(200);
    });

    it('should not allow unauthorized access to files', async () => {
      const response = await fetch(`${API_BASE_URL}/get-file?fileId=${uploadedFileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${f3Token}`
        }
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Analytics Tests', () => {
    it('should allow F3 user to access analytics', async () => {
      const response = await fetch(`${API_BASE_URL}/get-analytics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${f3Token}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('metadata');
    });

    it('should not allow F1/F2 users to access analytics', async () => {
      const f1Response = await fetch(`${API_BASE_URL}/get-analytics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${f1Token}`
        }
      });

      expect(f1Response.status).toBe(403);

      const f2Response = await fetch(`${API_BASE_URL}/get-analytics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${f2Token}`
        }
      });

      expect(f2Response.status).toBe(403);
    });
  });
});