// models/Session.ts
import mongoose, { Document, Schema } from "mongoose";

export interface ISession extends Document {
  user: mongoose.Types.ObjectId;
  serviceProvider: mongoose.Types.ObjectId;
  token: string;
  userType: "user" | "provider";
  deviceInfo?: string;
  ipAddress?: string;
  expiresAt: Date;
  createdAt: Date;
  isActive: boolean;
}

const SessionSchema: Schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    // required: true,
    refPath: "Users", 
  },
  serviceProvider: {
    type: Schema.Types.ObjectId,
    // required: true,
    refPath: "serviceproviders",
  },
  admin: {
    type: Schema.Types.ObjectId,
    refPath: "Admins",
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  userType: {
    type: String,
    required: true,
    enum: ["user", "provider", "admin","broker"],
  },
  deviceInfo: {
    type: String,
    default: "",
  },
  ipAddress: {
    type: String,
    default: "",
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

// Index for efficient querying
// SessionSchema.index({ token: 1 });
// SessionSchema.index({ user: 1, userType: 1 });
// SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = mongoose.model("Session", SessionSchema);