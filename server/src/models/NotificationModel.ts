import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    // Optional image attachment — populated by senders that allow image
    // upload (Quick Message broadcasts today). The bell dropdown shows a
    // thumbnail; the /dashboard/notifications page renders a bigger view
    // with a click-to-expand lightbox.
    image: { type: String },
    postLink: { type: String },
    sendTo: [
      {
        id: { type: String },
        name: { type: String },
      },
    ],
    sentBy: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
    type: {
      type: String,
      enum: [
        // legacy types — keep so old docs still validate
        "contact",
        "service",
        "admin",
        "event",
        "Post Like",
        "TradyCoin Credit",
        "membership",
        "payment-verification",
        "payment-verified",
        "payment-rejected",
        "wallet",
        "birthday",
        "broadcast",
        // SP-sourced
        "recommendation-new",
        "recommendation-modified",
        "recommendation-closed",
        "portfolio-update",
        "content-added",
        "event-update",
        "quickmessage",
        // Broker-sourced
        "trade-placed",
        "trade-rejected",
        "trade-modified",
        "trade-cancelled",
        "broker-disconnected",
        // Admin-sourced
        "renewal-success",
        "renewal-failed",
        "kyc-approved",
        "kyc-rejected",
        "profile-incomplete",
        "bank-missing",
        "announcement",
        "plan-expiring",
        "plan-expired",
        "system",
        // Support-ticket lifecycle — creation, reply, status update.
        "support-ticket",
      ],
    },
    // Origin tag — surfaces a per-source chip in the dropdown ("Tradebox" /
    // SP name / broker name). Existing docs default to "admin" since most
    // pre-existing notifications were admin/system-issued.
    category: {
      type: String,
      enum: ["admin", "sp", "broker"],
      default: "admin",
    },
    // Optional CTA override. When unset, the frontend falls back to the
    // type-default ctaLabel and finally to "View".
    ctaLabel: { type: String },
    // Broker key (e.g. "bigul", "aliceblue") — only populated for
    // category: "broker" notifications, used for the source chip label.
    broker: { type: String },
    // Per-recipient read tracking. A notification doc can be sent to many
    // users (see sendTo[]), so a flat isRead boolean would mark it read for
    // everyone. readBy stores one entry per user who has marked it read.
    readBy: [
      {
        id: { type: String, required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

export const notificationModel = mongoose.model(
  "notifications",
  notificationSchema
);
