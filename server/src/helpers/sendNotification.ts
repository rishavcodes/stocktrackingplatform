import { notificationModel } from "../models/NotificationModel";
import { UserModel, ServiceProviderRegModel, AdminModel } from "../models/AuthModels";
import { io } from "../index";
import { sendPushToUsers } from "../lib/webPush";

type RecipientRole = "user" | "provider" | "both" | "admin";

type SendNotificationArgs = {
  recipientIds: (string | undefined | null)[];
  recipientRole: RecipientRole;
  message: string;
  type: string;
  category: "admin" | "sp" | "broker";
  sentBy: { id: string; name: string };
  ctaLabel?: string;
  postLink?: string;
  broker?: string;
  // Optional human-readable recipient labels for the sendTo array on the
  // doc itself (purely cosmetic — used by the admin notification log UI).
  sendToLabel?: string;
  // Optional attached image URL (Quick Message broadcasts). Renders as a
  // thumbnail in the bell dropdown and a bigger image on the notifications
  // page, with a click-to-expand lightbox.
  image?: string;
};

/**
 * Create a single notificationModel doc, fan it out to the recipients'
 * notifications[] arrays, and push it over the /notifications socket
 * namespace to any connected clients.
 *
 * Errors are swallowed (logged only) — a failed notification must never
 * break the upstream operation that triggered it (placing an order,
 * posting an article, completing a payment, etc.).
 */
export async function sendNotification(args: SendNotificationArgs): Promise<void> {
  try {
    const ids = Array.from(
      new Set(
        (args.recipientIds || [])
          .map((id) => (id ? String(id) : ""))
          .filter(Boolean)
      )
    );
    if (ids.length === 0) return;

    const doc = await notificationModel.create({
      message: args.message,
      type: args.type,
      category: args.category,
      sentBy: args.sentBy,
      ctaLabel: args.ctaLabel,
      postLink: args.postLink,
      broker: args.broker,
      image: args.image,
      sendTo: args.sendToLabel ? [{ name: args.sendToLabel }] : [],
    });

    const update = { $addToSet: { notifications: doc._id } };
    const targets =
      args.recipientRole === "both"
        ? [UserModel, ServiceProviderRegModel]
        : args.recipientRole === "provider"
          ? [ServiceProviderRegModel]
          : args.recipientRole === "admin"
            ? [AdminModel]
            : [UserModel];

    await Promise.all(
      targets.map((Model) =>
        Model.updateMany({ _id: { $in: ids } }, update).catch((err) => {
          console.error(`[sendNotification] fan-out to ${Model.modelName} failed:`, err);
        })
      )
    );

    // Push to any connected clients on the /notifications namespace.
    // The client joins a room named after its user id on connect, so
    // emitting per-id only reaches the intended recipient.
    try {
      const nsp = io.of("/notifications");
      const payload = doc.toObject();
      for (const id of ids) {
        nsp.to(id).emit("notification:new", payload);
      }
    } catch (err) {
      console.error("[sendNotification] socket emit failed:", err);
    }

    // Browser push notification (PWA). Fires per-user across every device the
    // recipient has registered. Independent of the socket emit above — the
    // socket only reaches the currently-open browser tab, the push reaches
    // closed browsers / phones on the home screen. Errors are swallowed so a
    // bad VAPID config can't block the in-app notification path.
    try {
      // OS push title = sender name (e.g. "RA Nandini"). Falls back to the
      // app name only when no sender is provided (system reminders, etc.).
      const senderName = (args.sentBy?.name || "").trim();
      const pushTitle = senderName || "Tradebox";

      // If the in-app message starts with "{senderName}:" we strip that
      // prefix off the OS-banner body — the title already carries the name,
      // no need to repeat it. Bell dropdown still shows the full message.
      let bodyText = args.message;
      if (senderName) {
        const prefix = `${senderName}:`;
        if (bodyText.startsWith(prefix)) {
          bodyText = bodyText.slice(prefix.length).trim();
        }
      }
      const body = bodyText.length > 140 ? bodyText.slice(0, 137) + "…" : bodyText;

      // Stable tag = doc id → identical re-fires (e.g. retry path) replace
      // each other in the OS instead of stacking dupes.
      sendPushToUsers(ids, {
        title: pushTitle,
        body,
        url: args.postLink || "/dashboard",
        tag: String((doc as any)._id || ""),
        requireInteraction: false,
        // `image` shows a hero image on Chrome's OS banner (Windows / Android)
        // — Safari ignores it but doesn't error. Falls through cleanly when
        // there's no attached image.
        image: args.image,
        data: {
          notificationId: String((doc as any)._id || ""),
          type: args.type,
          category: args.category,
          postLink: args.postLink,
          ctaLabel: args.ctaLabel,
          image: args.image,
        },
      }).catch((err) => {
        console.error("[sendNotification] push fan-out failed:", err);
      });
    } catch (err) {
      console.error("[sendNotification] push setup failed:", err);
    }
  } catch (err) {
    console.error("[sendNotification] failed:", err);
  }
}
