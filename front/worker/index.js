/* eslint-disable no-restricted-globals */
/**
 * Custom service worker — appended to the next-pwa generated sw.js.
 *
 * Handles two events:
 *   1. "push"             — receive a push from server, show a notification
 *   2. "notificationclick" — when admin taps the notification, focus or open
 *                            the admin panel URL provided in the payload.
 */

self.addEventListener("push", (event) => {
    if (!event.data) return;

    let payload;
    try {
        payload = event.data.json();
    } catch {
        payload = { title: "TradeBox", body: event.data.text() };
    }

    const title = payload.title || "TradeBox";
    // If the server provided a ctaLabel (via data.ctaLabel), expose it as an
    // OS-level action button on the notification banner. Standard click on
    // the notification body still navigates to data.url — the action button
    // gives a labelled second tap target ("View Lead" / "View Receipt" etc.).
    const actions = payload.data?.ctaLabel
        ? [{ action: "view", title: payload.data.ctaLabel }]
        : undefined;

    const options = {
        body: payload.body || "",
        icon: payload.icon || "/favicon/android-icon-192x192.png",
        badge: payload.badge || "/favicon/favicon-96x96.png",
        tag: payload.tag,                              // browser-level dedup
        requireInteraction: !!payload.requireInteraction,
        actions,
        data: {
            url: payload.url || "/dashboard/admin/onboarding-issues",
            ...(payload.data || {}),
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    // Both the default click and the "view" action button route to the same
    // URL — the action button is purely a labelled affordance. If more action
    // types are added later (e.g. "dismiss", "mark-read"), branch on event.action.
    const targetUrl = event.notification.data?.url || "/dashboard/admin/onboarding-issues";

    event.waitUntil(
        (async () => {
            const allClients = await self.clients.matchAll({
                type: "window",
                includeUncontrolled: true,
            });

            // If the admin already has the app open, focus that tab and navigate
            for (const client of allClients) {
                if ("focus" in client && "navigate" in client) {
                    await client.focus();
                    try {
                        await client.navigate(targetUrl);
                    } catch {
                        // navigate may fail across origins; fall through to openWindow
                    }
                    return;
                }
            }

            // Otherwise open a new window/tab
            if (self.clients.openWindow) {
                await self.clients.openWindow(targetUrl);
            }
        })()
    );
});
