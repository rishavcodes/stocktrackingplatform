// models/LoginActivity.ts
//
// Append-only audit log of successful logins. Kept SEPARATE from Session
// because loginHandler runs SessionModel.deleteMany() on every login, so the
// Session collection holds at most one row per user and preserves no history.
// Unlike Session.ts, the indexes here are ACTIVE — including a TTL that prunes
// rows after 180 days.
import mongoose, { Document, Schema } from "mongoose";

export type LoginActivitySubjectType = "user" | "provider" | "admin";

export interface ILoginActivity extends Document {
  subjectId: mongoose.Types.ObjectId;
  subjectType: LoginActivitySubjectType;
  name?: string;
  email?: string;
  number?: string;
  category?: string;
  event: "login_success";
  ipAddress?: string;
  deviceInfo?: string;
  createdAt: Date;
}

const LoginActivitySchema: Schema = new Schema({
  // Deliberately NOT a hard ref — deleting the subject must never break the feed.
  subjectId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  subjectType: {
    type: String,
    required: true,
    enum: ["user", "provider", "admin"],
  },
  // Denormalized snapshot taken at login time so the feed renders without joins
  // and survives later renames/deletes of the subject.
  name: { type: String, default: "" },
  email: { type: String, default: "" },
  number: { type: String, default: "" },
  // Providers only (Broker / Research Analyst / PMS / AIF).
  category: { type: String, default: "" },
  // Kept as an enum-of-one for now so logout/failed events can be added later
  // without a migration.
  event: {
    type: String,
    required: true,
    enum: ["login_success"],
    default: "login_success",
  },
  ipAddress: { type: String, default: "" },
  deviceInfo: { type: String, default: "" },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Feed sort (reverse-chron) and per-subject drilldown.
LoginActivitySchema.index({ createdAt: -1 });
LoginActivitySchema.index({ subjectId: 1, createdAt: -1 });
// Retention: auto-prune after 180 days.
LoginActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 15552000 });

export const LoginActivityModel = mongoose.model<ILoginActivity>(
  "LoginActivity",
  LoginActivitySchema
);
