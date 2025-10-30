import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnv, cleanupTestEnv } from './helpers';
import fs from 'fs/promises';
import path from 'path';

const API_BASE_URL = 'http://localhost:3000/api';

const maybeDescribeInt = process.env.SKIP_SUPABASE_INTEGRATION === 'true' ? describe.skip : describe;

import { setupTestMode } from './helpers';

// Always run integration tests in offline mode
describe('Genetic Data API Integration Tests', () => {
  let testUsers: Awaited<ReturnType<typeof setupTestEnv>>;
  let uploadedFileId: string;

  beforeAll(async () => {
    setupTestMode();
    testUsers = await setupTestEnv();
  });

  afterAll(async () => {
    if (uploadedFileId) {
      await fetch(`${API_BASE_URL}/files/${uploadedFileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${testUsers.f1User.token}`
        }
      });
    }
    await cleanupTestEnv(testUsers);
  });

  describe('File Upload', () => {
    it('should allow F1 user to upload a file', async () => {
      const testFilePath = path.join(__dirname, 'fixtures', 'test.vcf');
      const fileContent = await fs.readFile(testFilePath);
      
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(fileContent)], { type: 'chemical/x-vcf' });
      formData.append('file', blob, 'test.vcf');

      const response = await fetch(`${API_BASE_URL}/upload-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUsers.f1User.token}`
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
      const fileContent = await fs.readFile(testFilePath);
      
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(fileContent)], { type: 'chemical/x-vcf' });
      formData.append('file', blob, 'test.vcf');

      const response = await fetch(`${API_BASE_URL}/upload-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUsers.f2User.token}`
        },
        body: formData
      });

      expect(response.status).toBe(403);
    });
  });

  describe('File Access Control', () => {
    it('should allow F1 user to grant access to F2 user', async () => {
      const response = await fetch(`${API_BASE_URL}/grant-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUsers.f1User.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: uploadedFileId,
          // Use the authId (auth user id) for grantee so the mock server can map correctly
          granteeId: testUsers.f2User.authId,
          accessLevel: 'read'
        })
      });

      expect(response.status).toBe(201);
    });

    it('should allow F2 user to access granted file', async () => {
      const response = await fetch(`${API_BASE_URL}/get-file?fileId=${uploadedFileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUsers.f2User.token}`
        }
      });

      expect(response.status).toBe(200);
      const contentType = response.headers.get('Content-Type');
      expect(contentType).toBe('chemical/x-vcf');
    });

    it('should not allow unauthorized access to files', async () => {
      const response = await fetch(`${API_BASE_URL}/get-file?fileId=${uploadedFileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUsers.f3User.token}`
        }
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Analytics Access', () => {
    it('should allow F3 user to access analytics', async () => {
      const response = await fetch(`${API_BASE_URL}/get-analytics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUsers.f3User.token}`
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
          'Authorization': `Bearer ${testUsers.f1User.token}`
        }
      });

      expect(f1Response.status).toBe(403);

      const f2Response = await fetch(`${API_BASE_URL}/get-analytics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUsers.f2User.token}`
        }
      });

      expect(f2Response.status).toBe(403);
    });
  });
});