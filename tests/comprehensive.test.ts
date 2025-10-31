import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { testUsers, setupTestEnv, cleanupTestEnv } from './helpers';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'http://localhost:3000/api';

describe('Comprehensive API Tests', () => {
  let createdUsers: Awaited<ReturnType<typeof setupTestEnv>>;
  let f1Token: string;
  let f2Token: string;
  let f3Token: string;
  let uploadedFileId: string;

  beforeAll(async () => {
    createdUsers = await setupTestEnv();
    f1Token = 'f1-token';
    f2Token = 'f2-token';
    f3Token = 'f3-token';
  });

  afterAll(async () => {
    await cleanupTestEnv(createdUsers);
  });

  describe('User Profile Endpoint (/api/get-profile)', () => {
    it('should get a user profile or create one if it does not exist', async () => {
      const response = await fetch(`${API_BASE_URL}/get-profile`, {
        headers: {
          'Authorization': `Bearer ${f1Token}`
        }
      });
      expect(response.status).toBe(200);
      const profile = await response.json();
      expect(profile.auth_id).toBe(createdUsers.f1User.authId);
      expect(profile.subscription_tier).toBe('F1');
    });
  });

  describe('File Upload Endpoint (/api/upload-file)', () => {
    it('should allow an F1 user to upload a file', async () => {
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

    it('should not allow an F2 user to upload a file', async () => {
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

  describe('Grant Access Endpoint (/api/grant-access)', () => {
    it('should allow an F1 user to grant access to an F2 user', async () => {
      const response = await fetch(`${API_BASE_URL}/grant-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${f1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: uploadedFileId,
          granteeId: createdUsers.f2User.userId,
          accessLevel: 'read'
        })
      });

      expect(response.status).toBe(201);
    });

    it('should not allow an F1 user to grant access to a file they do not own', async () => {
      // Another F1 user uploads a file
      const anotherF1User = await setupTestUser(testUsers.f1User);
      const testFilePath = path.join(__dirname, 'fixtures', 'test.vcf');
      const fileContent = await fs.promises.readFile(testFilePath);
      const formData = new FormData();
      formData.append('file', new Blob([fileContent], { type: 'chemical/x-vcf' }), 'test.vcf');

      const uploadResponse = await fetch(`${API_BASE_URL}/upload-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anotherF1User.token}`
        },
        body: formData
      });
      const fileData = await uploadResponse.json();

      const response = await fetch(`${API_BASE_URL}/grant-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${f1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: fileData.id,
          granteeId: createdUsers.f2User.userId,
          accessLevel: 'read'
        })
      });

      expect(response.status).toBe(403);
      await cleanupTestUser(anotherF1User.authId);
    });

    it('should not allow an F1 user to grant access to a non-F2 user', async () => {
      const response = await fetch(`${API_BASE_URL}/grant-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${f1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: uploadedFileId,
          granteeId: createdUsers.f3User.userId,
          accessLevel: 'read'
        })
      });

      expect(response.status).toBe(400);
    });

    it('should not allow an F1 user to grant access to a file that does not exist', async () => {
      const response = await fetch(`${API_BASE_URL}/grant-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${f1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: 'non-existent-file-id',
          granteeId: createdUsers.f2User.userId,
          accessLevel: 'read'
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Get File Endpoint (/api/get-file)', () => {
    it('should allow an F1 user to access their own file', async () => {
      const response = await fetch(`${API_BASE_URL}/get-file?fileId=${uploadedFileId}`, {
        headers: {
          'Authorization': `Bearer ${f1Token}`
        }
      });

      expect(response.status).toBe(200);
    });

    it('should allow an F2 user to access a file they have been granted access to', async () => {
      const response = await fetch(`${API_BASE_URL}/get-file?fileId=${uploadedFileId}`, {
        headers: {
          'Authorization': `Bearer ${f2Token}`
        }
      });

      expect(response.status).toBe(200);
    });

    it('should not allow an F3 user to access a file they have not been granted access to', async () => {
      const response = await fetch(`${API_BASE_URL}/get-file?fileId=${uploadedFileId}`, {
        headers: {
          'Authorization': `Bearer ${f3Token}`
        }
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Revoke Access Endpoint (/api/revoke-access)', () => {
    it('should allow an F1 user to revoke access to a file', async () => {
      const response = await fetch(`${API_BASE_URL}/revoke-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${f1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: uploadedFileId,
          granteeId: createdUsers.f2User.userId
        })
      });

      expect(response.status).toBe(200);
    });

    it('should not allow an F2 user to access a file after access has been revoked', async () => {
      const response = await fetch(`${API_BASE_URL}/get-file?fileId=${uploadedFileId}`, {
        headers: {
          'Authorization': `Bearer ${f2Token}`
        }
      });

      expect(response.status).toBe(403);
    });

    it('should not allow an F1 user to revoke access to a file they do not own', async () => {
      // Another F1 user uploads a file and grants access to F2 user
      const anotherF1User = await setupTestUser(testUsers.f1User);
      const testFilePath = path.join(__dirname, 'fixtures', 'test.vcf');
      const fileContent = await fs.promises.readFile(testFilePath);
      const formData = new FormData();
      formData.append('file', new Blob([fileContent], { type: 'chemical/x-vcf' }), 'test.vcf');

      const uploadResponse = await fetch(`${API_BASE_URL}/upload-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anotherF1User.token}`
        },
        body: formData
      });
      const fileData = await uploadResponse.json();

      await fetch(`${API_BASE_URL}/grant-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anotherF1User.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: fileData.id,
          granteeId: createdUsers.f2User.userId,
          accessLevel: 'read'
        })
      });

      const response = await fetch(`${API_BASE_URL}/revoke-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${f1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: fileData.id,
          granteeId: createdUsers.f2User.userId
        })
      });

      expect(response.status).toBe(403);
      await cleanupTestUser(anotherF1User.authId);
    });

    it('should not allow an F1 user to revoke access that does not exist', async () => {
      const response = await fetch(`${API_BASE_URL}/revoke-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${f1Token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: uploadedFileId,
          granteeId: 'non-existent-user-id'
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Analytics Endpoint (/api/get-analytics)', () => {
    it('should allow an F3 user to access analytics', async () => {
      const response = await fetch(`${API_BASE_URL}/get-analytics`, {
        headers: {
          'Authorization': `Bearer ${f3Token}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('metadata');
    });

    it('should not allow an F1 user to access analytics', async () => {
      const response = await fetch(`${API_BASE_URL}/get-analytics`, {
        headers: {
          'Authorization': `Bearer ${f1Token}`
        }
      });

      expect(response.status).toBe(403);
    });

    it('should not allow an F2 user to access analytics', async () => {
      const response = await fetch(`${API_BASE_URL}/get-analytics`, {
        headers: {
          'Authorization': `Bearer ${f2Token}`
        }
      });

      expect(response.status).toBe(403);
    });
  });
});
