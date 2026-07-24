import crypto from "crypto";

/**
 * At-rest encryption for stored CVL KRA credential secrets (api_key, password,
 * AES private key). This is SEPARATE from helpers/CvlKraCrypto.ts, which is the
 * CVL *wire* cipher keyed by each provider's own AES key.
 *
 * Scheme: AES-256-GCM (authenticated) with a server master key from
 * CVLKRA_DB_ENC_KEY (32 bytes, supplied as hex-64 or base64). A random 12-byte
 * IV per value. Stored as `base64(iv):base64(tag):base64(ciphertext)`.
 *
 * Rotating CVLKRA_DB_ENC_KEY invalidates all previously stored secrets
 * (providers must re-enter them).
 */

const ALGO = "aes-256-gcm";

/** Parse the master key from env (hex-64 or base64), validating it is 32 bytes. */
function getMasterKey(): Buffer {
  const raw = (process.env.CVLKRA_DB_ENC_KEY || "").trim();
  if (!raw) {
    throw new Error("CVLKRA_DB_ENC_KEY (server encryption key) is not configured");
  }
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== 32) {
    throw new Error(
      "CVLKRA_DB_ENC_KEY must decode to 32 bytes (got " + key.length + ")",
    );
  }
  return key;
}

/** True when a valid 32-byte master key is configured. */
export function isFieldCryptoReady(): boolean {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
}

/** Encrypt a plaintext secret -> "base64(iv):base64(tag):base64(ciphertext)". */
export function encryptField(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

/** Decrypt a value produced by encryptField(). Throws if tampered or malformed. */
export function decryptField(stored: string): string {
  const key = getMasterKey();
  const parts = (stored || "").split(":");
  if (parts.length !== 3) {
    throw new Error("Stored secret is not in iv:tag:ciphertext format");
  }
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
