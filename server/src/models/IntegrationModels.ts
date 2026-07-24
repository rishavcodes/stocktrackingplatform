import mongoose, { Schema } from "mongoose";

const RazorpayKeySchema = new mongoose.Schema(
  {
    keyId: { type: String, required: true },
    keySecret: { type: String, required: true }, // You may encrypt this
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true,
    },
    webhookSecret: { type: String, required: false },
    name: { type: String },
    email: { type: String },
  },
  { timestamps: true }
);

export const RazorpayKeyModel = mongoose.model("RazorpayKeys", RazorpayKeySchema);

const CashfreeKeySchema = new mongoose.Schema(
  {
    appId: { type: String, required: true },
    secretKey: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true,
    },
    name: { type: String },
    email: { type: String },
  },
  { timestamps: true }
);

export const CashfreeKeyModel = mongoose.model("CashfreeKeys", CashfreeKeySchema);

/**
 * Per-service-provider CVL KRA credentials. One doc per provider (userId
 * unique). The three true secrets (apiKey, password, aesKey) are stored
 * ENCRYPTED at rest via helpers/CvlKraFieldCrypto.ts; username/posCode and the
 * enums are stored plaintext (identifiers, not secrets).
 */
const CvlKraCredentialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true,
      unique: true, // unique implies an index
    },
    apiKey: { type: String, required: true }, // encrypted at rest
    password: { type: String, required: true }, // encrypted at rest
    aesKey: { type: String, required: true }, // encrypted at rest (base64URL private key)
    username: { type: String, required: true },
    posCode: { type: String, required: true },
    environment: { type: String, enum: ["uat", "live"], default: "uat" },
    fetchType: { type: String, enum: ["E", "I", "X"], default: "E" },
    name: { type: String },
    email: { type: String },
  },
  { timestamps: true },
);

export const CvlKraCredentialModel = mongoose.model(
  "CvlKraCredentials",
  CvlKraCredentialSchema,
);
