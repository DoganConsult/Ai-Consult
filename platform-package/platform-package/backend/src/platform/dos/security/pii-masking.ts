// ============================================
// Shahin GRC — PII Masking Utility
// One-way SHA-256 hashing for PII fields
// before audit log persistence
// ============================================

import { createHash } from "crypto";

/** PII field names (and common variations) that must be masked */
const PII_FIELDS = new Set([
  "email",
  "user_email",
  "name",
  "user_name",
  "username",
  "ip",
  "ip_address",
  "ipaddress",
]);

/**
 * One-way hash a single value using SHA-256.
 * Returns hex-encoded digest prefixed with "sha256:" for clarity.
 */
export function hashValue(value: string): string {
  return "sha256:" + createHash("sha256").update(value).digest("hex");
}

/**
 * Returns true if the given key (case-insensitive) is a PII field.
 */
export function isPIIField(key: string): boolean {
  return PII_FIELDS.has(key.toLowerCase());
}

/**
 * Masks PII fields in a flat or nested object by replacing their values
 * with one-way SHA-256 hashes. Non-PII fields are left untouched.
 * Handles strings, nested objects, and arrays.
 * Returns a new object — the original is never mutated.
 */
export function maskPII<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data === "string") return data as T;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => maskPII(item)) as any as T;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (isPIIField(key) && typeof value === "string" && value.length > 0) {
      result[key] = hashValue(value);
    } else if (value !== null && typeof value === "object") {
      result[key] = maskPII(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
