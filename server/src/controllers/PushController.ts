/**
 * Web Push subscription endpoints (admin-scoped).
 *
 * POST   /api/admin/push/subscribe        — register a browser for push
 * DELETE /api/admin/push/subscribe        — remove a subscription
 * GET    /api/admin/push/public-key       — fetch VAPID public key
 * POST   /api/admin/push/test             — send a test push to the caller
 */

import { Request, Response } from "express";
import { PushSubscriptionModel } from "../models/PushSubscriptionModel";
import { sendPushToRole } from "../lib/webPush";

function getCallerUserId(req: Request): string | null {
    const u = (req as any).user;
    return u?.id ?? u?._id ?? u?.userId ?? null;
}

function getCallerRole(req: Request): "admin" | "subadmin" | "provider" | "user" | null {
    const u = (req as any).user;
    const r = u?.role;
    if (r === "admin" || r === "subadmin" || r === "provider" || r === "user") {
        return r;
    }
    return null;
}

export const getPushPublicKey = async (_req: Request, res: Response) => {
    return res.status(200).json({
        success: true,
        publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
    });
};

export const subscribeToPush = async (req: Request, res: Response) => {
    try {
        const userId = getCallerUserId(req);
        const role = getCallerRole(req);
        if (!userId || !role) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }

        const { endpoint, keys } = req.body ?? {};
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid subscription payload" });
        }

        // Upsert by endpoint — same browser re-subscribing should not duplicate
        const sub = await PushSubscriptionModel.findOneAndUpdate(
            { endpoint },
            {
                userId,
                role,
                endpoint,
                keys,
                userAgent: req.headers["user-agent"],
                lastUsedAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res
            .status(200)
            .json({ success: true, subscriptionId: sub._id });
    } catch (error: any) {
        console.error("subscribeToPush error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Failed to save push subscription" });
    }
};

export const unsubscribeFromPush = async (req: Request, res: Response) => {
    try {
        const { endpoint } = req.body ?? {};
        const userId = getCallerUserId(req);

        if (endpoint) {
            // Normal case: specific browser subscription being removed
            await PushSubscriptionModel.deleteOne({ endpoint });
        } else if (userId) {
            // Fallback: the browser couldn't surface its endpoint (PWA disabled,
            // SW unregistered, etc.). Drop every subscription belonging to this
            // caller so they actually stop receiving pushes.
            await PushSubscriptionModel.deleteMany({ userId });
        }
        // Idempotent — return success either way so the UI never gets stuck
        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error("unsubscribeFromPush error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Failed to remove subscription" });
    }
};

export const sendTestPush = async (req: Request, res: Response) => {
    try {
        const role = getCallerRole(req);
        if (!role) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }
        const result = await sendPushToRole(role, {
            title: "TradeBox test notification",
            body: "If you can see this, push notifications are working.",
            url: "/dashboard/admin/onboarding-issues",
            tag: "test-push",
        });
        return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
        console.error("sendTestPush error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Failed to send test push" });
    }
};
