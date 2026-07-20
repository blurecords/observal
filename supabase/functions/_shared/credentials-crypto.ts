/** AES-256-GCM credential encryption for Edge Functions (Deno). */

const SENSITIVE_METADATA_KEYS = [
  "snmp_community",
  "pjlink_password",
  "sis_password",
  "novastar_password",
] as const;

function getKey(): CryptoKey | null {
  const raw = Deno.env.get("CREDENTIALS_ENCRYPTION_KEY");
  if (!raw) return null;
  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  if (bytes.length !== 32) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY must be 32 bytes base64");
  }
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

let keyPromise: Promise<CryptoKey | null> | null = null;

async function loadKey(): Promise<CryptoKey | null> {
  if (!keyPromise) keyPromise = getKey();
  return keyPromise;
}

export async function decryptCredentials(
  blob: string,
): Promise<Record<string, string>> {
  const key = await loadKey();
  if (!key) return {};

  const data = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0));
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

export function extractLegacyCredentials(
  metadata: Record<string, unknown>,
): Record<string, string> {
  const creds: Record<string, string> = {};
  for (const k of SENSITIVE_METADATA_KEYS) {
    const v = metadata[k];
    if (typeof v === "string" && v) creds[k] = v;
  }
  return creds;
}

export async function resolveCollectorCredentials(
  metadata: Record<string, unknown>,
  credentialsEncrypted: string | null,
): Promise<Record<string, string | number | boolean>> {
  const merged: Record<string, string | number | boolean> = {};

  for (const [key, val] of Object.entries(metadata ?? {})) {
    if (val !== null && val !== undefined) {
      merged[key] = val as string | number | boolean;
    }
  }

  if (credentialsEncrypted) {
    Object.assign(merged, await decryptCredentials(credentialsEncrypted));
  } else {
    Object.assign(merged, extractLegacyCredentials(metadata));
  }

  return merged;
}
