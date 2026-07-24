/**
 * Web Push subscription helpers for the admin panel.
 *
 * Usage:
 *   import { ensurePushSubscribed, isPushSupported, getPushPermission } from "@/lib/pushNotifications";
 *
 *   if (isPushSupported()) {
 *       const result = await ensurePushSubscribed(backendToken);
 *       // result.status === "granted" | "denied" | "default" | "unsupported"
 *   }
 */

const SUBSCRIBE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/push/subscribe`;
const UNSUBSCRIBE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/push/subscribe`;
const TEST_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/push/test`;

export function isPushSupported(): boolean {
    if (typeof window === "undefined") return false;
    return (
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
}

export function getPushPermission(): NotificationPermission | "unsupported" {
    if (!isPushSupported()) return "unsupported";
    return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
    const bytes = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) bytes[i] = rawData.charCodeAt(i);
    return bytes;
}

async function getActiveSWRegistration(): Promise<ServiceWorkerRegistration> {
    // next-pwa should register the SW automatically, but on deployed
    // environments (Vercel/UAT) the registration sometimes fails silently —
    // a stale precache miss leaves it stuck installing, or the file is
    // served with the wrong Content-Type. If we just `await ready` blindly
    // we hang forever and the toast shows the misleading "dev only" message.
    //
    // So: (1) make sure a registration exists, force-register if not, then
    // (2) race `ready` against an 8s timeout that THROWS — instead of
    // hanging, the caller now logs a real error pointing at /sw.js.
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
        console.warn("[push] no registration found — forcing /sw.js register");
        try {
            reg = await navigator.serviceWorker.register("/sw.js");
            console.log("[push] /sw.js registered, scope =", reg.scope);
        } catch (err) {
            console.error("[push] /sw.js register failed:", err);
            throw new Error(
                "Service worker /sw.js could not be registered — check it's deployed and served as application/javascript"
            );
        }
    }

    const ready = navigator.serviceWorker.ready;
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(
            () =>
                reject(
                    new Error(
                        "Service worker never reached 'activated' state within 8s — check /sw.js install errors in DevTools → Application → Service Workers"
                    )
                ),
            8000
        )
    );
    return Promise.race([ready, timeout]);
}

export async function ensurePushSubscribed(
    backendToken: string
): Promise<{ status: NotificationPermission | "unsupported"; subscribed: boolean }> {
    console.log("[push] ensurePushSubscribed: starting");

    if (!isPushSupported()) {
        console.warn("[push] not supported — serviceWorker / PushManager / Notification missing");
        return { status: "unsupported", subscribed: false };
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
        console.warn("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set — cannot subscribe");
        return { status: "unsupported", subscribed: false };
    }
    console.log("[push] VAPID public key found, length =", publicKey.length);

    // Ask the user for permission (no-op if already granted/denied)
    let permission = Notification.permission;
    console.log("[push] current Notification.permission =", permission);
    if (permission === "default") {
        console.log("[push] requesting permission…");
        permission = await Notification.requestPermission();
        console.log("[push] permission result =", permission);
    }

    if (permission !== "granted") {
        console.warn("[push] permission not granted — returning early");
        return { status: permission, subscribed: false };
    }

    console.log("[push] awaiting navigator.serviceWorker.ready…");
    let registration: ServiceWorkerRegistration;
    try {
        registration = await getActiveSWRegistration();
    } catch (err) {
        console.error("[push] service worker unavailable:", err);
        return { status: "unsupported", subscribed: false };
    }
    console.log("[push] service worker ready:", registration.scope);

    // Reuse existing subscription if it's still valid; otherwise create one.
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
        console.log("[push] reusing existing PushSubscription:", subscription.endpoint);
    } else {
        console.log("[push] no existing subscription, calling pushManager.subscribe…");
        try {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                // Cast through BufferSource — modern TS lib types narrow Uint8Array
                // by its underlying ArrayBuffer, but PushManager accepts both.
                applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
            });
            console.log("[push] subscribed OK:", subscription.endpoint);
        } catch (err) {
            console.error("[push] pushManager.subscribe failed:", err);
            return { status: permission, subscribed: false };
        }
    }

    // Hand the subscription to the backend so it can push to us later.
    const subJson = subscription.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
    };

    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        console.warn("[push] subscription shape invalid — bailing", subJson);
        return { status: permission, subscribed: false };
    }

    console.log("[push] POSTing subscription to backend:", SUBSCRIBE_URL);
    try {
        const res = await fetch(SUBSCRIBE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${backendToken}`,
            },
            body: JSON.stringify({
                endpoint: subJson.endpoint,
                keys: subJson.keys,
            }),
        });
        if (!res.ok) {
            console.error("[push] backend rejected subscribe:", res.status, await res.text().catch(() => ""));
            return { status: permission, subscribed: false };
        }
        console.log("[push] backend accepted subscription");
    } catch (err) {
        console.error("[push] fetch to backend failed:", err);
        return { status: permission, subscribed: false };
    }

    return { status: permission, subscribed: true };
}

// Race a promise against a timeout. If the timeout wins, we resolve with
// the fallback so the caller can keep going.
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
    return new Promise<T>((resolve) => {
        const timer = setTimeout(() => resolve(fallback), ms);
        p.then(
            (val) => {
                clearTimeout(timer);
                resolve(val);
            },
            () => {
                clearTimeout(timer);
                resolve(fallback);
            }
        );
    });
}

export async function unsubscribeFromPush(backendToken: string): Promise<void> {
    if (!isPushSupported()) return;

    // Try to grab the SW registration, but don't hang forever if PWA is
    // disabled in dev or the worker is unregistered.
    const registration = await withTimeout(
        navigator.serviceWorker.ready,
        3000,
        null as ServiceWorkerRegistration | null
    );

    let endpoint: string | null = null;

    if (registration) {
        try {
            const subscription = await withTimeout(
                registration.pushManager.getSubscription(),
                3000,
                null as PushSubscription | null
            );
            if (subscription) {
                endpoint = subscription.endpoint;
                // Best-effort browser-level unsubscribe; ignore failures.
                try {
                    await withTimeout(subscription.unsubscribe(), 5000, false);
                } catch {
                    /* ignore */
                }
            }
        } catch {
            /* ignore — still try to clean up backend */
        }
    }

    // Always tell backend to drop its record, even if the browser side failed
    try {
        await withTimeout(
            fetch(UNSUBSCRIBE_URL, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${backendToken}`,
                },
                body: JSON.stringify({ endpoint }),
            }),
            5000,
            null as Response | null
        );
    } catch {
        /* ignore — UI still flips to "off" */
    }
}

export async function sendTestPush(backendToken: string): Promise<boolean> {
    try {
        const res = await fetch(TEST_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${backendToken}`,
            },
        });
        const data = await res.json();
        return !!data?.success;
    } catch {
        return false;
    }
}
