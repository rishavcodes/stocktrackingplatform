// src/models/EsignSessionModel.ts
import mongoose, { Schema, Document } from "mongoose";

export type EsignStatus =
  | "INITIATED"
  | "PDF_UPLOADED"
  | "SIGNED"
  | "COMPLETED"
  | "FAILED"
  | "PAYMENT_BLOCKED";

export type AadhaarMatchStatus =
  | "pending"
  | "matched"
  | "mismatched"
  | "report_unavailable";

export interface IEsignSession extends Document {
  clientId: string;

  userId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;

  // The RA (exact selling profile id, = item.authorData.id) whose T&C was
  // signed. Denormalised so "has this user signed this RA's T&C for any item?"
  // is a single indexed lookup, regardless of which service was signed.
  raId?: string;

  // When a session is materialised by reusing an earlier signature (the
  // "sign once per RA" skip), this points back to the original signed session.
  reusedFromClientId?: string;

  status: EsignStatus;

  signedDocURL?: string;

  errorMessage?: string;

  metadata?: Record<string, any>;

  aadhaarMatchStatus?: AadhaarMatchStatus;
  aadhaarLast4FromPan?: string;
  aadhaarLast4FromEsign?: string;

  chargeDebited?: boolean;
  chargeDebitedAt?: Date;
  chargeAmount?: number;
  walletTransactionId?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const EsignSessionSchema = new Schema<IEsignSession>(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },

    raId: {
      type: String,
      index: true,
    },

    reusedFromClientId: {
      type: String,
    },

    status: {
      type: String,
      enum: ["INITIATED", "PDF_UPLOADED", "SIGNED", "COMPLETED", "FAILED", "PAYMENT_BLOCKED"],
      default: "INITIATED",
      index: true,
    },

    signedDocURL: {
      type: String,
    },

    errorMessage: {
      type: String,
    },

    metadata: {
      type: Schema.Types.Mixed,
    },

    aadhaarMatchStatus: {
      type: String,
      enum: ["pending", "matched", "mismatched", "report_unavailable"],
      index: true,
    },
    aadhaarLast4FromPan: {
      type: String,
    },
    aadhaarLast4FromEsign: {
      type: String,
    },

    // SP onboarding charge is debited at e-sign completion. chargeDebited is
    // the idempotency guard against double-debit on callback retries.
    chargeDebited: {
      type: Boolean,
      default: false,
      index: true,
    },
    chargeDebitedAt: {
      type: Date,
    },
    chargeAmount: {
      type: Number,
    },
    walletTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Auto-expire incomplete eSign sessions
 * (optional but recommended)
 */
EsignSessionSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24, // 24 hours
    partialFilterExpression: {
      status: { $in: ["INITIATED", "PDF_UPLOADED"] },
    },
  }
);

export const EsignSessionModel =
  mongoose.models.EsignSession ||
  mongoose.model<IEsignSession>("EsignSession", EsignSessionSchema);
