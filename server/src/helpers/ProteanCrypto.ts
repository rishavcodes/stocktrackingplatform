// utils/ProteanCryptoUtil.ts
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = Buffer.from(process.env.PROTEAN_PRIVATE_KEY!, "utf8");
const AES_KEY_LENGTH = 32; // 256-bit AES

// Generate random AES key
function generateAESKey(): Buffer {
  return crypto.randomBytes(AES_KEY_LENGTH);
}

// Encrypt payload using AES
function encryptPayloadAES(payload: object, aesKey: Buffer): string {
  const iv = crypto.randomBytes(16);
   const keyObject = crypto.createSecretKey(new Uint8Array(aesKey));
   const cipher = crypto.createCipheriv(
     "aes-256-cbc",
     keyObject,
     new Uint8Array(iv)
   );
  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "base64");
  encrypted += cipher.final("base64");
  const encryptedData = iv.toString("base64") + ":" + encrypted;
  return encryptedData;
}

// Encrypt AES key using RSA Private Key
function encryptAESKeyWithPrivateKey(aesKey: Buffer): string {
  const encryptedKey = crypto.privateEncrypt(
    {
      key: `-----BEGIN RSA PRIVATE KEY-----\n${PRIVATE_KEY}\n-----END RSA PRIVATE KEY-----`,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    new Uint8Array(aesKey)
  );
  return encryptedKey.toString("base64");
}

// Create SHA256 signature
function generateSHA256Signature(encryptedData: string): string {
  return crypto.createHash("sha256").update(encryptedData).digest("hex");
}

// Combine all
export function encryptProteanRequest(payload: object) {
  const aesKey = generateAESKey();
  const encryptedData = encryptPayloadAES(payload, aesKey);
  const encryptedKey = encryptAESKeyWithPrivateKey(aesKey);
  const signature = generateSHA256Signature(encryptedData);

  return {
    data: encryptedData,
    key: encryptedKey,
    signature,
  };
}
