import crypto from 'crypto';

if (typeof window !== 'undefined') {
  throw new Error('lib/encryption.ts must only be imported on the server.');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes recommended for AES-GCM
const TAG_LENGTH = 16; // 16 bytes auth tag

/**
 * Validates and extracts the 32-byte Buffer from the 64-char hexadecimal encryption key.
 */
export function getEncryptionKey(overrideKey?: string): Buffer {
  const rawKey = (overrideKey ?? process.env.AMBASSADOR_PASSWORD_ENCRYPTION_KEY)?.trim();

  if (!rawKey) {
    throw new Error(
      'AMBASSADOR_PASSWORD_ENCRYPTION_KEY is missing from the environment. Password encryption cannot proceed.'
    );
  }

  if (!/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    throw new Error(
      'AMBASSADOR_PASSWORD_ENCRYPTION_KEY is malformed. Key must be exactly 64 hexadecimal characters representing 32 bytes.'
    );
  }

  return Buffer.from(rawKey, 'hex');
}

/**
 * Encrypts an ambassador password using AES-256-GCM authenticated encryption.
 * Encodes output as: v1:<ivHex>:<tagHex>:<ciphertextHex>
 */
export function encryptAmbassadorPassword(plaintext: string, overrideKey?: string): string {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('Plaintext password must be a non-empty string.');
  }

  const keyBuffer = getEncryptionKey(overrideKey);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypts and authenticates an ambassador password.
 * Throws an Error if the ciphertext or authentication tag has been tampered with.
 */
export function decryptAmbassadorPassword(encryptedPayload: string, overrideKey?: string): string {
  if (typeof encryptedPayload !== 'string' || !encryptedPayload.startsWith('v1:')) {
    throw new Error('Invalid encrypted password payload format: missing version prefix.');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted password payload format: expected 4 segments.');
  }

  const [, ivHex, tagHex, ciphertextHex] = parts;

  if (ivHex.length !== IV_LENGTH * 2) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH * 2} hex characters.`);
  }

  if (tagHex.length !== TAG_LENGTH * 2) {
    throw new Error(`Invalid authentication tag length: expected ${TAG_LENGTH * 2} hex characters.`);
  }

  if (!/^[0-9a-fA-F]+$/.test(ciphertextHex) || ciphertextHex.length === 0) {
    throw new Error('Invalid ciphertext segment.');
  }

  const keyBuffer = getEncryptionKey(overrideKey);
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err: any) {
    throw new Error(
      'Decryption failed: authentication tag verification failed. Ciphertext may have been tampered with.'
    );
  }
}

/**
 * Safe decryption helper for UI rendering: returns null if payload is null, empty, or unparseable.
 */
export function decryptAmbassadorPasswordSafe(encryptedPayload?: string | null): string | null {
  if (!encryptedPayload) return null;
  try {
    return decryptAmbassadorPassword(encryptedPayload);
  } catch {
    return null;
  }
}
