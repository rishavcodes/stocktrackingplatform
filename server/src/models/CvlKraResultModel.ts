import mongoose, { Schema } from "mongoose";

/**
 * Cached CVL KRA result per PAN (one upserted doc per PAN). The subscriber's
 * PAN itself stays on UserSchema.pannumber — this only stores the KRA outcome
 * for "last checked" display + an audit trail (full parsed payload in `raw`).
 */
const CvlKraResultSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider",
      index: true,
    },
    panNumber: { type: String, required: true, index: true, unique: true },
    appName: { type: String },
    appStatus: { type: String }, // raw APP_STATUS code
    statusLabel: { type: String }, // mapped human label
    kraName: { type: String }, // derived KRA
    appStatusDt: { type: String }, // APP_STATUSDT
    fatcaApplicable: { type: String }, // APP_FATCA_APPLICABLE_FLAG
    raw: { type: mongoose.Schema.Types.Mixed }, // full parsed KYC_DATA + FATCA + SUMM
    errorCode: { type: String },
    errorMessage: { type: String },
    checkedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const CvlKraResultModel = mongoose.model(
  "CvlKraResults",
  CvlKraResultSchema,
);
