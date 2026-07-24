import mongoose from "mongoose";

const ThreadMessageSchema = new mongoose.Schema(
  {
    // "sp" and "user" both identify the ticket submitter (the difference is only
    // surfaced in the UI for routing). "admin" identifies a Tradebox staff
    // reply. The unread-flag flip in the controller treats sp/user identically
    // — any non-admin reply flips adminUnread, any admin reply flips spUnread.
    from: { type: String, enum: ["sp", "user", "admin"], required: true },
    fromId: { type: String, required: true },
    fromName: { type: String, required: true },
    // text is optional now — a message can be image-only. We still require
    // that EITHER text or at least one attachment is present, enforced in
    // the controller (Mongoose can't express "one-of" cleanly here).
    text: { type: String, default: "" },
    // S3 URLs of images uploaded inline with this message. Empty array =
    // text-only reply (the common case).
    attachments: { type: [String], default: [] },
  },
  { timestamps: true, _id: true }
);

const SupportTicketSchema = new mongoose.Schema(
  {
    submittedBy: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      type: { type: String },
    },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 5000 },

    // Top-level area in the SP dashboard — values come from a closed list in
    // the frontend wizard (Wallet / Articles / Coupons / Payment / etc.). We
    // keep the type as a free String so legacy tickets (which used
    // bug|feature|question|other) keep loading, and so adding a new sidebar
    // tab doesn't require a schema migration.
    category: {
      type: String,
      default: "other",
      required: true,
    },
    // Drill-down within `category` — e.g. Wallet → "Withdrawal".
    subCategory: { type: String, default: "Other" },

    // Provider-self-selected urgency with concrete SLAs surfaced in the UI.
    priority: {
      type: String,
      enum: ["urgent", "high", "normal", "low"],
      default: "normal",
    },

    // Silent auto-capture from the browser at submit time. Lets admins skip
    // the "what page / what browser / what version" round-trips.
    context: {
      pageUrl: { type: String },
      route: { type: String },
      userAgent: { type: String },
      viewport: { type: String },
      appVersion: { type: String },
      userType: { type: String },
      _id: false,
    },

    // Human-friendly identifier shown to SP + searchable by admin.
    // Format: SUP-YYYY-NNNN (NNNN = 1-based count for that calendar year).
    ticketNumber: { type: String, unique: true, sparse: true, index: true },

    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
      required: true,
    },

    // Admin-side classification — orthogonal to status. Lets the team triage
    // incoming tickets as either a real bug or a feature request without
    // changing what the SP sees. Null = untagged (default for new tickets).
    adminTag: {
      type: String,
      enum: ["bug", "enhancement", null],
      default: null,
    },
    adminTagBy: {
      id: { type: String },
      name: { type: String },
      _id: false,
    },
    adminTagAt: { type: Date },

    attachments: { type: [String], default: [] },

    thread: { type: [ThreadMessageSchema], default: [] },

    // Unread flags — flipped true when "the other side" did something the
    // viewer hasn't seen yet, flipped false when the viewer opens the ticket.
    spUnread: { type: Boolean, default: false },
    adminUnread: { type: Boolean, default: true },

    resolvedAt: { type: Date },
    resolvedBy: {
      id: { type: String },
      name: { type: String },
    },
  },
  { timestamps: true }
);

SupportTicketSchema.index({ "submittedBy.id": 1, createdAt: -1 });
SupportTicketSchema.index({ status: 1, createdAt: -1 });
SupportTicketSchema.index({ "submittedBy.id": 1, spUnread: 1 });
SupportTicketSchema.index({ adminUnread: 1 });

export const SupportTicketModel = mongoose.model(
  "supporttickets",
  SupportTicketSchema
);
