import { describe, it, expect } from 'vitest';
import { EncryptionService } from '../src/services/encryption';

describe('EncryptionService', () => {
  const service = new EncryptionService();
  const testData = Buffer.from('test data for encryption');

  it('should encrypt and decrypt data correctly', async () => {
    // Encrypt data
    const { encryptedData, key, iv } = await service.encryptFile(testData);
    
    // Decrypt data
    const decryptedData = await service.decryptFile(encryptedData, key, iv);
    
    // Compare original and decrypted data
    expect(decryptedData.toString()).toBe(testData.toString());
  });

  it('should generate correct SHA-256 hash', async () => {
    // Encrypt data
    const { encryptedData, hash } = await service.encryptFile(testData);
    
    // Verify hash
    const isValid = await service.verifyHash(encryptedData, hash);
    expect(isValid).toBe(true);
  });

  it('should detect invalid hash', async () => {
    // Encrypt data
    const { encryptedData } = await service.encryptFile(testData);
    
    // Trying to verify with invalid hash
    const isValid = await service.verifyHash(encryptedData, 'invalid_hash');
    expect(isValid).toBe(false);
  });
});