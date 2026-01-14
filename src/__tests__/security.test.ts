
import { describe, it, expect } from '@jest/globals';
import { CryptographicCore } from '../verification/security.js';

describe('CryptographicCore', () => {
  it('should encrypt and decrypt data correctly', () => {
    const core = new CryptographicCore();
    const message = 'This is a super secret message for verification';
    const password = 'my-secure-password';

    const encryptedData = core.encrypt(message, password);

    expect(encryptedData).toHaveProperty('encrypted');
    expect(encryptedData).toHaveProperty('iv');
    expect(encryptedData).toHaveProperty('tag');
    expect(encryptedData).toHaveProperty('salt');

    const decrypted = core.decrypt(encryptedData, password);

    expect(decrypted).toBe(message);
  });

  it('should produce different ciphertexts for same data (due to random IV/salt)', () => {
    const core = new CryptographicCore();
    const message = 'Same message';
    const password = 'same-password';

    const result1 = core.encrypt(message, password);
    const result2 = core.encrypt(message, password);

    expect(result1.encrypted).not.toBe(result2.encrypted);
    expect(result1.iv).not.toBe(result2.iv);
    expect(result1.salt).not.toBe(result2.salt);
  });

  it('should fail decryption with wrong password', () => {
    const core = new CryptographicCore();
    const message = 'Secret';
    const password = 'correct-password';
    const wrongPassword = 'wrong-password';

    const encryptedData = core.encrypt(message, password);

    expect(() => {
      core.decrypt(encryptedData, wrongPassword);
    }).toThrow();
  });
});
