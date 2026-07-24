import mongoose, { Schema, Document } from "mongoose";

export type OnboardingIssueStep =
    | "esign_init"
    | "esign_callback"
    | "esign_aadhaar_mismatch"
    | "esign_session_timeout"
    | "payment_init"
    | "payment_verification"
    | "order_creation"
    | "wallet_deduction"
    | "telegram_invite"
    | "other";

export type OnboardingIssueSeverity = "info" | "warning" | "critical";

export type OnboardingIssueStatus =
    | "new"
    | "investigating"
    | "resolved"
    | "refunded"
    | "ignored";

export interface IOnboardingIssue extends Document {
    step: OnboardingIssueStep;
    severity: OnboardingIssueSeverity;
    reason: string;
    errorCode?: string;
    errorMessage?: string;

    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;

    spId?: string;
    spName?: string;

    planId?: string;
    planTitle?: string;
    planPrice?: number;

    paymentId?: string;
    orderId?: string;
    clientId?: string;

    userAgent?: string;
    ipAddress?: string;

    metadata?: Record<string, any>;
    stack?: string;

    // Dedup — same customer + step + errorCode within 1 hour updates an
    // existing row instead of inserting a new one. Keeps the inbox clean.
    fingerprint?: string;
    occurrenceCount: number;
    lastOccurredAt: Date;
    slackAlertedAt?: Date;

    status: OnboardingIssueStatus;
    notes?: string;
    resolvedAt?: Date;
    resolvedBy?: string;

    createdAt: Date;
    updatedAt: Date;
}

const OnboardingIssueSchema = new Schema<IOnboardingIssue>(
    {
        step: {
            type: String,
            required: true,
            enum: [
                "esign_init", "esign_callback", "esign_aadhaar_mismatch", "esign_session_timeout",
                "payment_init", "payment_verification", "order_creation", "wallet_deduction",
                "telegram_invite", "other",
            ],
            index: true,
        },
        severity: {
            type: String,
            required: true,
            enum: ["info", "warning", "critical"],
            default: "warning",
            index: true,
        },
        reason: { type: String, required: true },
        errorCode: { type: String },
        errorMessage: { type: String },

        customerId: { type: String, index: true },
        customerName: { type: String },
        customerEmail: { type: String, index: true },
        customerPhone: { type: String },

        spId: { type: String, index: true },
        spName: { type: String },

        planId: { type: String, index: true },
        planTitle: { type: String },
        planPrice: { type: Number },

        paymentId: { type: String },
        orderId: { type: String },
        clientId: { type: String },

        userAgent: { type: String },
        ipAddress: { type: String },

        metadata: { type: Schema.Types.Mixed },
        stack: { type: String },

        fingerprint: { type: String, index: true },
        occurrenceCount: { type: Number, default: 1 },
        lastOccurredAt: { type: Date, default: Date.now, index: true },
        slackAlertedAt: { type: Date },

        status: {
            type: String,
            enum: ["new", "investigating", "resolved", "refunded", "ignored"],
            default: "new",
            index: true,
        },
        notes: { type: String },
        resolvedAt: { type: Date },
        resolvedBy: { type: String },
    },
    { timestamps: true }
);

OnboardingIssueSchema.index({ createdAt: -1 });
OnboardingIssueSchema.index({ status: 1, lastOccurredAt: -1 });

export const OnboardingIssueModel =
    mongoose.models.OnboardingIssue ||
    mongoose.model<IOnboardingIssue>("OnboardingIssue", OnboardingIssueSchema);
