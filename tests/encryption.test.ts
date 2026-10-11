import {
  encryptAmbassadorPassword,
  decryptAmbassadorPassword,
  decryptAmbassadorPasswordSafe,
  getEncryptionKey,
} from '../lib/encryption';
import { printTestSummary, TestResult } from './helpers/test-results';

async function runEncryptionTestSuite() {
  const results: TestResult[] = [];
  console.log('Starting Ambassador Password AES-256-GCM Encryption Test Suite...\n');

  const validKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  // --- 1. Round-Trip Encryption & Decryption ---
  try {
    const testPasswords = [
      'adminPass123!',
      'Kishwar@2026#Secure',
      'P@$$w0rd-with-symbols-and-spaces 99',
      '8CharsMin',
      'Unicode_🔐_Pässwörd',
    ];

    let allRoundTripsPassed = true;
    for (const pwd of testPasswords) {
      const encrypted = encryptAmbassadorPassword(pwd, validKey);
      const decrypted = decryptAmbassadorPassword(encrypted, validKey);
      if (decrypted !== pwd) {
        allRoundTripsPassed = false;
        break;
      }
    }

    results.push({
      name: 'Encryption Round-Trip: Plaintext encrypts and decrypts to exact original value',
      passed: allRoundTripsPassed,
    });
  } catch (err: any) {
    results.push({
      name: 'Encryption Round-Trip: Plaintext encrypts and decrypts to exact original value',
      passed: false,
      details: err.message,
    });
  }

  // --- 2. Encrypted Payload Format ---
  try {
    const encrypted = encryptAmbassadorPassword('SampleSecret123', validKey);
    const parts = encrypted.split(':');
    const isV1 = parts[0] === 'v1';
    const ivLength = parts[1]?.length === 24; // 12 bytes = 24 hex chars
    const tagLength = parts[2]?.length === 32; // 16 bytes = 32 hex chars
    const hasCiphertext = Boolean(parts[3] && parts[3].length > 0);

    results.push({
      name: 'Payload Encoding: Stores format v1:<12-byte IV>:<16-byte AuthTag>:<Ciphertext> in hex',
      passed: isV1 && ivLength && tagLength && hasCiphertext,
    });
  } catch (err: any) {
    results.push({
      name: 'Payload Encoding: Stores format v1:<12-byte IV>:<16-byte AuthTag>:<Ciphertext> in hex',
      passed: false,
      details: err.message,
    });
  }

  // --- 3. Tampering Detection & Authentication Tag Verification ---
  try {
    const originalCiphertext = encryptAmbassadorPassword('SuperSecretPassword88', validKey);
    const parts = originalCiphertext.split(':');

    // Tamper ciphertext
    const tamperedCiphertextChar = parts[3].charAt(0) === 'a' ? 'b' : 'a';
    const tamperedCiphertext = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedCiphertextChar}${parts[3].slice(1)}`;

    let ciphertextTamperCaught = false;
    try {
      decryptAmbassadorPassword(tamperedCiphertext, validKey);
    } catch {
      ciphertextTamperCaught = true;
    }

    // Tamper auth tag
    const tamperedTagChar = parts[2].charAt(0) === 'f' ? '0' : 'f';
    const tamperedTag = `${parts[0]}:${parts[1]}:${tamperedTagChar}${parts[2].slice(1)}:${parts[3]}`;

    let tagTamperCaught = false;
    try {
      decryptAmbassadorPassword(tamperedTag, validKey);
    } catch {
      tagTamperCaught = true;
    }

    // Tamper IV
    const tamperedIvChar = parts[1].charAt(0) === 'c' ? '1' : 'c';
    const tamperedIv = `${parts[0]}:${tamperedIvChar}${parts[1].slice(1)}:${parts[2]}:${parts[3]}`;

    let ivTamperCaught = false;
    try {
      decryptAmbassadorPassword(tamperedIv, validKey);
    } catch {
      ivTamperCaught = true;
    }

    results.push({
      name: 'Tamper Resistance: Tampering ciphertext, authentication tag, or IV fails decryption',
      passed: ciphertextTamperCaught && tagTamperCaught && ivTamperCaught,
    });
  } catch (err: any) {
    results.push({
      name: 'Tamper Resistance: Tampering ciphertext, authentication tag, or IV fails decryption',
      passed: false,
      details: err.message,
    });
  }

  // --- 4. Missing or Invalid Key Configuration ---
  try {
    let missingCaught = false;
    try {
      getEncryptionKey('');
    } catch (err: any) {
      missingCaught = err.message.includes('missing');
    }

    let shortKeyCaught = false;
    try {
      getEncryptionKey('1234567890abcdef'); // only 16 chars
    } catch (err: any) {
      shortKeyCaught = err.message.includes('malformed');
    }

    let nonHexKeyCaught = false;
    try {
      getEncryptionKey('g'.repeat(64)); // 'g' is not hex
    } catch (err: any) {
      nonHexKeyCaught = err.message.includes('malformed');
    }

    results.push({
      name: 'Configuration Validation: Missing or non-64-hex encryption key fails safely with clear error',
      passed: missingCaught && shortKeyCaught && nonHexKeyCaught,
    });
  } catch (err: any) {
    results.push({
      name: 'Configuration Validation: Missing or non-64-hex encryption key fails safely with clear error',
      passed: false,
      details: err.message,
    });
  }

  // --- 5. Safe Decryption Helper ---
  try {
    const validEncrypted = encryptAmbassadorPassword('SafeHelperTestPass', validKey);
    process.env.AMBASSADOR_PASSWORD_ENCRYPTION_KEY = validKey;

    const safeSuccess = decryptAmbassadorPasswordSafe(validEncrypted);
    const safeNull = decryptAmbassadorPasswordSafe(null);
    const safeUndefined = decryptAmbassadorPasswordSafe(undefined);
    const safeCorrupt = decryptAmbassadorPasswordSafe('invalid:corrupt:payload');

    results.push({
      name: 'Safe Decryption Helper: Returns decrypted string on valid payload, null on null/corrupt',
      passed:
        safeSuccess === 'SafeHelperTestPass' &&
        safeNull === null &&
        safeUndefined === null &&
        safeCorrupt === null,
    });
  } catch (err: any) {
    results.push({
      name: 'Safe Decryption Helper: Returns decrypted string on valid payload, null on null/corrupt',
      passed: false,
      details: err.message,
    });
  }

  const allPassed = printTestSummary(results);
  if (!allPassed) {
    process.exit(1);
  }
}

runEncryptionTestSuite().catch((err) => {
  console.error('Encryption test execution failed:', err);
  process.exit(1);
});
