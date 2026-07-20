/** AES-256-GCM credential blob — shared format with Supabase Edge Functions. */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const SENSITIVE_METADATA_KEYS = [
  "snmp_community",
  "pjlink_password",
  "sis_password",
  "novastar_password",
] as const;

export type SensitiveCredentialKey = (typeof SENSITIVE_METADATA_KEYS)[number];

export function extractSensitiveCredentials(
  metadata: Record<string, unknown>,
): Record<string, string> {
  const creds: Record<string, string> = {};
  for (const key of SENSITIVE_METADATA_KEYS) {
    const val = metadata[key];
    if (typeof val === "string" && val.length > 0) {
      creds[key] = val;
    }
  }
  return creds;
}

export function stripSensitiveCredentials(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const clean = { ...metadata };
  for (const key of SENSITIVE_METADATA_KEYS) {
    delete clean[key];
  }
  return clean;
}

function getEncryptionKey(): Buffer | null {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY must be 32 bytes (base64-encoded)");
  }
  return key;
}

export function encryptionEnabled(): boolean {
  return !!process.env.CREDENTIALS_ENCRYPTION_KEY;
}

export function encryptCredentials(credentials: Record<string, string>): string {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY not configured");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify(credentials);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

export function decryptCredentials(blob: string): Record<string, string> {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY not configured");
  }

  const data = Buffer.from(blob, "base64");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(data.length - 16);
  const ciphertext = data.subarray(12, data.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as Record<string, string>;
}

export function prepareDeviceStorage(metadata: Record<string, unknown>): {
  metadata: Record<string, unknown>;
  credentials_encrypted: string | null;
} {
  const sensitive = extractSensitiveCredentials(metadata);
  const cleanMetadata = stripSensitiveCredentials(metadata);

  if (Object.keys(sensitive).length === 0) {
    return { metadata: cleanMetadata, credentials_encrypted: null };
  }

  if (!encryptionEnabled()) {
    return { metadata, credentials_encrypted: null };
  }

  return {
    metadata: cleanMetadata,
    credentials_encrypted: encryptCredentials(sensitive),
  };
}

export function resolveDeviceCredentials(
  metadata: Record<string, unknown>,
  credentialsEncrypted: string | null,
): Record<string, string | number | boolean> {
  const merged: Record<string, string | number | boolean> = {};

  for (const [key, val] of Object.entries(metadata ?? {})) {
    if (val !== null && val !== undefined) {
      merged[key] = val as string | number | boolean;
    }
  }

  if (credentialsEncrypted && encryptionEnabled()) {
    Object.assign(merged, decryptCredentials(credentialsEncrypted));
  }

  return merged;
}
