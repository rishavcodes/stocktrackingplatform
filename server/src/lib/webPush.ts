/**
 * Web Push helper — fires browser push notifications to admin devices.
 *
 * Required env vars:
 *   VAPID_PUBLIC_KEY        — base64-url public key (also exposed to FE)
 *   VAPID_PRIVATE_KEY       — base64-url private key (server only)
 *   VAPID_SUBJECT           — mailto: or https URL identifying your app
 *
 * Generate keys once with: node server/scripts/generateVapidKeys.js
 *
 * SEBI note:
 *   The push payload we send contains ONLY:
 *     - title
 *     - body (short, no PII beyond name/email if you choose to include)
 *     - URL to open in your admin panel
 *   Customer details stay in your India-hosted MongoDB. Admin clicks the
 *   notification → opens the admin panel → reads details from your DB.
 *
 *   The push transport itself (browser → FCM → device) is part of the
 *   web platform and not avoidable for PWA notifications. Push payloads
 *   are encrypted in transit using the subscription's p256dh/auth keys.
 */

import webpush from "web-push";
import { PushSubscriptionModel } from "../models/PushSubscriptionModel";

let initialized = false;

function initWebPush(): boolean {
    if (initialized) return true;

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
        return false;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    initialized = true;
    return true;
}

export interface PushPayload {
    title: string;
    body: string;
    url?: string;          // path to open when notification is clicked
    tag?: string;          // browser-level dedup tag — same tag replaces existing notification
    icon?: string;         // URL to an icon
    badge?: string;        // small monochrome icon (Android status bar)
    image?: string;        // hero image (Chrome on Windows/Android; ignored elsewhere)
    requireInteraction?: boolean;
    data?: Record<string, any>;
}

/**
 * Send a push notification to every active subscription for a given role.
 * Stale/invalid subscriptions are automatically pruned from the DB.
 */
export async function sendPushToRole(
    role: "admin" | "subadmin" | "provider" | "user",
    payload: PushPayload
): Promise<{ sent: number; pruned: number }> {
    if (!initWebPush()) {
        console.log("[webPush] VAPID keys not configured — skipping push");
        return { sent: 0, pruned: 0 };
    }

    const subs = await PushSubscriptionModel.find({ role }).lean();
    if (subs.length === 0) {
        return { sent: 0, pruned: 0 };
    }

    let sent = 0;
    const toDelete: string[] = [];

    const body = JSON.stringify(payload);

    await Promise.all(
        subs.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: sub.keys,
                    },
                    body,
                    { TTL: 60 * 60 } // 1 hour — drop if device offline longer
                );
                sent++;
                // Touch lastUsedAt so we can later prune cold subscriptions
                await PushSubscriptionModel.updateOne(
                    { _id: sub._id },
                    { $set: { lastUsedAt: new Date() } }
                );
            } catch (err: any) {
                // 404/410 from the push service = subscription is dead, prune it.
                if (err?.statusCode === 404 || err?.statusCode === 410) {
                    toDelete.push(String(sub._id));
                } else {
                    console.error("[webPush] sendNotification failed:", err?.statusCode, err?.body);
                }
            }
        })
    );

    if (toDelete.length > 0) {
        await PushSubscriptionModel.deleteMany({ _id: { $in: toDelete } });
        console.log(`[webPush] Pruned ${toDelete.length} stale subscription(s)`);
    }

    return { sent, pruned: toDelete.length };
}

export async function sendPushToAdmins(payload: PushPayload) {
    return sendPushToRole("admin", payload);
}

/**
 * Per-user push — used by `sendNotification` so that in-app notifications
 * also produce a browser push notification on each registered device.
 *
 * A single user can have multiple subscription docs (phone + laptop + …).
 * All of them get the push. Dead endpoints are pruned in-place.
 */
export async function sendPushToUsers(
    userIds: string[],
    payload: PushPayload
): Promise<{ sent: number; pruned: number }> {
    if (!initWebPush()) {
        return { sent: 0, pruned: 0 };
    }
    const ids = Array.from(new Set((userIds || []).filter(Boolean)));
    if (ids.length === 0) return { sent: 0, pruned: 0 };

    const subs = await PushSubscriptionModel.find({ userId: { $in: ids } }).lean();
    if (subs.length === 0) return { sent: 0, pruned: 0 };

    let sent = 0;
    const toDelete: string[] = [];
    const body = JSON.stringify(payload);

    await Promise.all(
        subs.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: sub.keys },
                    body,
                    { TTL: 60 * 60 }
                );
                sent++;
                await PushSubscriptionModel.updateOne(
                    { _id: sub._id },
                    { $set: { lastUsedAt: new Date() } }
                );
            } catch (err: any) {
                if (err?.statusCode === 404 || err?.statusCode === 410) {
                    toDelete.push(String(sub._id));
                } else {
                    console.error("[webPush] per-user send failed:", err?.statusCode, err?.body);
                }
            }
        })
    );

    if (toDelete.length > 0) {
        await PushSubscriptionModel.deleteMany({ _id: { $in: toDelete } });
        console.log(`[webPush] Pruned ${toDelete.length} stale subscription(s)`);
    }

    return { sent, pruned: toDelete.length };
}
