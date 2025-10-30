import * as forge from 'node-forge';
import { createHash } from 'crypto';

export interface EncryptionResult {
  encryptedData: Buffer;
  key: string;
  iv: string;
  hash: string;
}

export class EncryptionService {
  /**
   * Encrypts file data and generates SHA-256 hash of the encrypted content
   */
  async encryptFile(fileData: Buffer): Promise<EncryptionResult> {
    // Generate random key and IV
    const key = forge.random.getBytesSync(32);
    const iv = forge.random.getBytesSync(16);

    // Create cipher
    const cipher = forge.cipher.createCipher('AES-CBC', key);
    cipher.start({ iv });
    
    // Process file data in chunks
    cipher.update(forge.util.createBuffer(fileData));
    cipher.finish();

    const encrypted = Buffer.from(cipher.output.getBytes(), 'binary');
    
    // Generate SHA-256 hash of encrypted data
    const hash = createHash('sha256').update(encrypted).digest('hex');

    return {
      encryptedData: encrypted,
      key: forge.util.bytesToHex(key),
      iv: forge.util.bytesToHex(iv),
      hash
    };
  }

  /**
   * Decrypts file data using provided key and IV
   */
  async decryptFile(encryptedData: Buffer, key: string, iv: string): Promise<Buffer> {
    const decipher = forge.cipher.createDecipher('AES-CBC', forge.util.hexToBytes(key));
    decipher.start({ iv: forge.util.hexToBytes(iv) });
    
    decipher.update(forge.util.createBuffer(encryptedData));
    decipher.finish();

    return Buffer.from(decipher.output.getBytes(), 'binary');
  }

  /**
   * Verifies if a hash matches the encrypted data
   */
  async verifyHash(encryptedData: Buffer, storedHash: string): Promise<boolean> {
    const computedHash = createHash('sha256').update(encryptedData).digest('hex');
    return computedHash === storedHash;
  }
}