// @ts-nocheck

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;  // GCM recommended IV length
const TAG_LENGTH = 16; // Auth tag length
const ENCODING = 'base64';

/**
 * Get the encryption key from environment.
 * Falls back to a deterministic key derived from NODE_ENV for dev/test.
 * In production, CREDENTIAL_ENCRYPTION_KEY must be set (32-byte hex string).
 */
function getKey(): Buffer {
  const envKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (envKey) {
    const buf = Buffer.from(envKey, 'hex');
    if (buf.length !== 32) throw new Error('CREDENTIAL_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
    return buf;
  }
  // Dev/test fallback — NOT for production
  return crypto.scryptSync('dos-platform-dev-key', 'dos-platform-salt', 32);
}

/**
 * Encrypt a plaintext string (typically JSON credentials).
 * Returns: base64(iv + ciphertext + authTag)
 */
export function encryptCredentials(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Pack: iv (12) + encrypted (N) + tag (16)
  const packed = Buffer.concat([iv, encrypted, tag]);
  return packed.toString(ENCODING);
}

/**
 * Decrypt a base64-encoded ciphertext back to plaintext.
 * Input format: base64(iv + ciphertext + authTag)
 */
export function decryptCredentials(ciphertext: string): string {
  const key = getKey();
  const packed = Buffer.from(ciphertext, ENCODING);

  if (packed.length < IV_LENGTH + TAG_LENGTH + 1) {
    // Not encrypted (legacy plain JSON) — return as-is
    return ciphertext;
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(packed.length - TAG_LENGTH);
  const encrypted = packed.subarray(IV_LENGTH, packed.length - TAG_LENGTH);

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    // Decryption failed — likely legacy plain JSON, return as-is
    return ciphertext;
  }
}

/**
 * Check if a string appears to be encrypted (base64 with expected structure).
 */
export function isEncrypted(value: string): boolean {
  try {
    const buf = Buffer.from(value, ENCODING);
    return buf.length >= IV_LENGTH + TAG_LENGTH + 1 && value !== buf.toString('utf8');
  } catch {
    return false;
  }
}

/**
 * Encrypt credentials object (Record<string, string>) to an encrypted string.
 */
export function encryptCredentialObject(credentials: Record<string, string>): string {
  return encryptCredentials(JSON.stringify(credentials));
}

/**
 * Decrypt an encrypted string back to a credentials object.
 * Handles both encrypted and legacy plain JSON.
 */
export function decryptCredentialObject(encrypted: string): Record<string, string> {
  const decrypted = decryptCredentials(encrypted);
  try {
    return JSON.parse(decrypted);
  } catch {
    return {};
  }
}
