// utils/ProteanUtils.ts
import crypto from "crypto";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const PROTEAN_OAUTH_URL = "https://uat.risewithprotean.io/v1/oauth/token";
const PUBLIC_KEY = process.env.PROTEAN_PUBLIC_KEY!;

export async function getOAuthToken(): Promise<string> {
  const clientId = process.env.PROTEAN_API_KEY!;
  const clientSecret = process.env.PROTEAN_SECRET_KEY!;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const headers = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const body = new URLSearchParams({ grant_type: "client_credentials" });

  const res = await axios.post(PROTEAN_OAUTH_URL, body.toString(), { headers });
  return res.data.access_token;
}

// 👉 Generate Timestamp, Version, UUID
export function generateRequestMeta() {
  const timestamp = new Date().toISOString(); // Format: YYYY-MM-DDTHH:mm:ss.SSSZ
  return {
    version: "1.0.0",
    timestamp,
    requestId: uuidv4(),
  };
}

// 👉 Encrypt Payload for Protean
export function encryptProteanPayload(payload: object) {
  const { version, timestamp, requestId } = generateRequestMeta();

  // 1. Generate AES key and IV
  const aesKey = crypto.randomBytes(32); // 256-bit key
  const iv = crypto.randomBytes(12); // 12 bytes for GCM

  // 2. Encrypt the payload using AES-256-GCM
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    new Uint8Array(aesKey),
    new Uint8Array(iv)
  );
  const jsonData = JSON.stringify(payload);
  let encrypted = cipher.update(jsonData, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  const encryptedData = iv.toString("base64") + ":" + encrypted + ":" + authTag;

  // 3. Encrypt AES key using Protean PUBLIC key
  const publicKeyFormatted = `-----BEGIN PUBLIC KEY-----\n${PUBLIC_KEY}\n-----END PUBLIC KEY-----`;
  const encryptedAESKey = crypto
    .publicEncrypt(
      {
        key: publicKeyFormatted,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      new Uint8Array(aesKey)
    )
    .toString("base64");

  // 4. Generate SHA256 hash of original payload using AES key
  const hash = crypto
    .createHmac("sha256", new Uint8Array(aesKey))
    .update(jsonData)
    .digest("base64");

  // 5. Final request body
  return {
    data: encryptedData,
    symmetricKey: encryptedAESKey,
    hash,
    version,
    timestamp,
    requestId,
  };
}


export function decryptProteanResponse(response: {
  data: string;
  symmetricKey: string;
  hash: string;
}) {
  const { data, symmetricKey, hash } = response;

  const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----\n${process.env.PROTEAN_PRIVATE_KEY}\n-----END RSA PRIVATE KEY-----`;

  // 1. Decrypt AES Key
  const aesKey = crypto.privateDecrypt(
    {
      key: PRIVATE_KEY,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    },
    new Uint8Array(Buffer.from(symmetricKey, "base64"))
  );

  // 2. Split encrypted payload into IV, Encrypted Data, Auth Tag
  const [ivBase64, encryptedBase64, tagBase64] = data.split(":");
  const iv = Buffer.from(ivBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");
  const authTag = Buffer.from(tagBase64, "base64");

  // 3. AES-GCM Decryption
  const keyObject = crypto.createSecretKey(new Uint8Array(aesKey));
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    keyObject,
    new Uint8Array(iv)
  );
  decipher.setAuthTag(new Uint8Array(authTag));

  const decrypted = decipher.update(new Uint8Array(encrypted));
  const finalBuffer = decipher.final();

  const combined = Buffer.concat([
    new Uint8Array(decrypted),
    new Uint8Array(finalBuffer),
  ]);
  const decryptedText = combined.toString("utf8");

  // 4. HMAC-SHA256 Hash Verification
  const calculatedHash = crypto
    .createHmac("sha256", new Uint8Array(aesKey))
    .update(new Uint8Array(combined)) // ✅ Full decrypted payload
    .digest("base64");

  if (calculatedHash !== hash) {
    throw new Error("Hash mismatch — response may be tampered");
  }

  // 5. Parse JSON
  return JSON.parse(decryptedText);
}