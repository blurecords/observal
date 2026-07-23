/** AES-256-GCM credential encryption for Edge Functions (Deno). */

const SENSITIVE_METADATA_KEYS = [
  "snmp_community",
  "pjlink_password",
  "sis_password",
  "novastar_password",
  "mikrotik_password",
] as const;

let keyPromise: Promise<CryptoKey | null> | null = null;

async function loadKey(): Promise<CryptoKey | null> {
  if (keyPromise) return keyPromise;

  keyPromise = (async () => {
    const raw = Deno.env.get("CREDENTIALS_ENCRYPTION_KEY");
    if (!raw) return null;

    try {
      const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
      if (bytes.length !== 32) {
        console.error(
          "CREDENTIALS_ENCRYPTION_KEY must be 32 bytes base64 — decryption disabled",
        );
        return null;
      }
      return await crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
        "encrypt",
        "decrypt",
      ]);
    } catch (err) {
      console.error("CREDENTIALS_ENCRYPTION_KEY invalid:", err);
      return null;
    }
  })();

  return keyPromise;
}

export async function decryptCredentials(
  blob: string,
): Promise<Record<string, string>> {
  try {
    const key = await loadKey();
    if (!key) return {};

    const data = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0));
    if (data.length < 13) return {};

    const iv = data.slice(0, 12);
    const ciphertext = data.slice(12);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch (err) {
    console.error("decryptCredentials failed:", err);
    return {};
  }
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
    const decrypted = await decryptCredentials(credentialsEncrypted);
    if (Object.keys(decrypted).length > 0) {
      Object.assign(merged, decrypted);
    } else {
      Object.assign(merged, extractLegacyCredentials(metadata));
    }
  } else {
    Object.assign(merged, extractLegacyCredentials(metadata));
  }

  return merged;
}
