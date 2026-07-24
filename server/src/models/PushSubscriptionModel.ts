/**
 * PushSubscriptionModel
 *
 * Stores one row per browser/device that has subscribed to web push.
 * Multiple rows per admin are expected (one per device they've enabled
 * notifications on — phone, laptop, etc.).
 *
 * SEBI note: this only stores the push transport identifiers issued by
 * the user's browser. No customer/business data is stored here.
 */

import mongoose, { Schema, Document } from "mongoose";

export interface IPushSubscription extends Document {
    // Owner of this subscription. For now we only push to admins.
    userId: string;
    role: "admin" | "subadmin" | "provider" | "user";

    // The push subscription itself (as returned by the browser)
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };

    // Diagnostic / cleanup
    userAgent?: string;
    lastUsedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
    {
        userId: { type: String, required: true, index: true },
        role: {
            type: String,
            enum: ["admin", "subadmin", "provider", "user"],
            required: true,
            index: true,
        },
        endpoint: { type: String, required: true, unique: true },
        keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true },
        },
        userAgent: { type: String },
        lastUsedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const PushSubscriptionModel =
    mongoose.models.PushSubscription ||
    mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
