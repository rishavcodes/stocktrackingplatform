import mongoose, { Document, Schema } from "mongoose";

// Logged once per `View as` action initiated from the admin dashboard.
// Tracks who impersonated whom and when so we have a paper trail without
// having to tag every individual write. Per the agreed scope, individual
// CRUD actions during impersonation are NOT tagged with `impersonatedBy`
// (yet) — only the start/end window is captured here.
export interface IImpersonationLog extends Document {
  adminId: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId;
  targetType: "provider" | "user";
  startedAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

const ImpersonationLogSchema: Schema = new Schema({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: "Admins",
    required: true,
    index: true,
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  targetType: {
    type: String,
    enum: ["provider", "user"],
    required: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  ipAddress: { type: String, default: "" },
  userAgent: { type: String, default: "" },
});

export const ImpersonationLogModel = mongoose.model(
  "ImpersonationLog",
  ImpersonationLogSchema,
);
