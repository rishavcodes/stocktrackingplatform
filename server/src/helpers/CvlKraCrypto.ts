import crypto from "crypto";

/**
 * CVL KRA payload encryption (the CVL *wire* cipher).
 *
 * Scheme (per the JSON+Encryption API v2.5 spec):
 *   - AES-256-CBC, PKCS5/PKCS7 padding
 *   - random 16-byte IV per request
 *   - key = base64URL-decoded provider AES key (32 bytes => AES-256)
 *   - wire format: base64URL(IV) + ":" + base64URL(ciphertext)
 *
 * The response `resdtls` arrives in the same `IV:Encrypted` form and is fed
 * back through decryptCvl().
 *
 * The AES key is the calling provider's own key, passed in per call (each
 * service provider has their own CVL credentials).
 *
 * NOTE: the spec text mandates AES-256 + base64URL (the C#/Java/Python samples
 * agree). The doc's Node sample uses aes-192-cbc + plain base64 — treat that as
 * a doc bug and confirm at UAT. If CVL issues a 24-byte key, switch ALGO to
 * "aes-192-cbc".
 */

function resolveAlgo(key: Buffer): string {
  switch (key.length) {
    case 32:
      return "aes-256-cbc";
    case 24:
      return "aes-192-cbc";
    case 16:
      return "aes-128-cbc";
    default:
      throw new Error(
        `CVL KRA AES key must decode to 16, 24, or 32 bytes (got ${key.length})`,
      );
  }
}

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(str: string): Buffer {
  const norm = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = norm.length % 4 === 0 ? "" : "=".repeat(4 - (norm.length % 4));
  return Buffer.from(norm + pad, "base64");
}

function b64stdDecode(str: string): Buffer {
  const norm = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = norm.length % 4 === 0 ? "" : "=".repeat(4 - (norm.length % 4));
  return Buffer.from(norm + pad, "base64");
}

function normalizeKeyInput(input: string): string {
  // Remove surrounding quotes and all whitespace/newlines from pasted keys.
  return input.trim().replace(/^['"]|['"]$/g, "").replace(/\s+/g, "");
}

function tryDecodeCandidates(raw: string): Buffer[] {
  const candidates: Buffer[] = [];

  // base64URL/base64 candidate
  if (/^[A-Za-z0-9\-_+/=]+$/.test(raw)) {
    candidates.push(b64urlDecode(raw));
    candidates.push(b64stdDecode(raw));
  }

  // hex candidate (16/24/32-byte keys => 32/48/64 hex chars)
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
    candidates.push(Buffer.from(raw, "hex"));
  }

  // raw UTF-8 bytes candidate
  candidates.push(Buffer.from(raw, "utf8"));

  return candidates;
}

function toKey(aesKeyB64url: string): Buffer {
  const raw = normalizeKeyInput(aesKeyB64url || "");
  if (!raw) {
    throw new Error("CVL KRA AES key is missing");
  }
  const candidates = tryDecodeCandidates(raw);
  const key = candidates.find((buf) => [16, 24, 32].includes(buf.length));
  if (!key) {
    const lengths = [...new Set(candidates.map((c) => c.length))].join(", ");
    throw new Error(
      `CVL KRA AES key must decode to 16, 24, or 32 bytes (decoded lengths: ${lengths || "none"})`,
    );
  }
  return key;
}

/** Encrypt a plaintext JSON string into the `IV:EncryptedData` (base64URL) form. */
export function encryptCvl(plaintext: string, aesKeyB64url: string): string {
  const key = toKey(aesKeyB64url);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(resolveAlgo(key), key, iv); // PKCS padding ON by default
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return `${b64urlEncode(iv)}:${b64urlEncode(encrypted)}`;
}

/** Decrypt an `IV:EncryptedData` (base64URL) payload back to the plaintext string. */
export function decryptCvl(payload: string, aesKeyB64url: string): string {
  const sep = payload.indexOf(":");
  if (sep === -1) {
    throw new Error("CVL KRA payload is not in IV:EncryptedData format");
  }
  const key = toKey(aesKeyB64url);
  const iv = b64urlDecode(payload.slice(0, sep));
  const data = b64urlDecode(payload.slice(sep + 1));
  const decipher = crypto.createDecipheriv(resolveAlgo(key), key, iv);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
