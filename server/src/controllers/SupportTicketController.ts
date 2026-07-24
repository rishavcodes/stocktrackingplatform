import type { Request, Response } from "express";
import mongoose from "mongoose";
import { SupportTicketModel } from "../models/SupportTicketModel";
import {
  AdminModel,
  ServiceProviderRegModel,
  UserModel,
} from "../models/AuthModels";
import { notificationModel } from "../models/NotificationModel";
import { sendNotification } from "../helpers/sendNotification";

const ALLOWED_STATUSES = ["open", "in_progress", "resolved"] as const;
const ALLOWED_PRIORITIES = ["urgent", "high", "normal", "low"] as const;

type Status = (typeof ALLOWED_STATUSES)[number];
type Priority = (typeof ALLOWED_PRIORITIES)[number];

type TicketDoc = {
  _id: any;
  title: string;
  submittedBy: { id: string; name: string; email: string; type?: string };
  status: Status;
  category: string;
  subCategory?: string;
  priority?: Priority;
  ticketNumber?: string;
};

// Builds the next SUP-YYYY-NNNN identifier for the current calendar year.
// Uses a count-then-increment approach: it's not strictly atomic, but for
// support-ticket creation rates a race is theoretical and the unique index
// on ticketNumber will reject any collision (caller retries).
async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await SupportTicketModel.countDocuments({
    createdAt: { $gte: start, $lt: end },
  });
  const padded = String(count + 1).padStart(4, "0");
  return `SUP-${year}-${padded}`;
}

async function notifyAllAdmins(message: string, sentBy: { id: string; name: string }) {
  const notification = await notificationModel.create({
    message,
    sendTo: [{ name: "Admins" }],
    sentBy,
    type: "admin",
  });
  await AdminModel.updateMany(
    { isActive: true },
    { $addToSet: { notifications: notification._id.toString() } }
  );
}

/**
 * Real-time, push-capable ticket notification. Routes through the central
 * sendNotification helper so the recipient gets:
 *   - a row in their notifications doc (persisted)
 *   - a /notifications socket emit (live bell update + chime)
 *   - a PWA push (OS-banner)
 *
 * `recipient` may be "user" (customer), "provider" (SP), "admin" (all
 * active admins via wildcard id), or "both" (user+provider).
 */
async function notifyTicketEvent(args: {
  recipientIds: (string | undefined | null)[];
  recipientRole: "user" | "provider" | "admin" | "both";
  message: string;
  sentBy: { id: string; name: string };
  ticketId: string;
  ctaLabel?: string;
  postLink?: string;
}) {
  try {
    await sendNotification({
      recipientIds: args.recipientIds,
      recipientRole: args.recipientRole,
      message: args.message,
      type: "support-ticket",
      category: args.recipientRole === "admin" ? "admin" : "sp",
      sentBy: args.sentBy,
      postLink: args.postLink,
      ctaLabel: args.ctaLabel || "View Ticket",
      sendToLabel:
        args.recipientRole === "admin"
          ? "Tradebox Admins"
          : args.recipientRole === "provider"
            ? "Service Provider"
            : "Customer",
    });
  } catch (err) {
    console.error("[support-ticket] notify failed:", err);
  }
}

// Resolves every active admin id so sendNotification can fan out to all of
// them (socket + bell + push). Cached per request would be overkill — admin
// rosters are small and tickets are infrequent.
async function getActiveAdminIds(): Promise<string[]> {
  const admins = await AdminModel.find({ isActive: true }).select("_id").lean();
  return admins.map((a: any) => String(a._id));
}

async function notifySingleSP(
  spId: string,
  message: string,
  sentBy: { id: string; name: string }
) {
  const notification = await notificationModel.create({
    message,
    sendTo: [{ id: spId }],
    sentBy,
    type: "admin",
  });
  await ServiceProviderRegModel.findByIdAndUpdate(spId, {
    $addToSet: { notifications: notification._id.toString() },
  });
  // Also store on UserModel in case the SP profile lives there
  await UserModel.findByIdAndUpdate(spId, {
    $addToSet: { notifications: notification._id.toString() },
  });
}

/* ==========================================================================
   POST /api/support/tickets
   SP creates a new ticket.
   Accepts multipart/form-data with optional `attachments` files (max 5 images).
========================================================================== */
export const createTicket = async (req: Request, res: Response) => {
  try {
    const uploadedFiles = (req.files as Express.MulterS3.File[] | undefined) || [];
    const attachments = uploadedFiles.map((f) => f.location).filter(Boolean);

    const {
      title,
      description,
      category,
      subCategory,
      priority,
    }: {
      title?: string;
      description?: string;
      category?: string;
      subCategory?: string;
      priority?: Priority;
    } = req.body;

    // submittedBy and context come as JSON strings under multipart, or as
    // objects under JSON. Handle both.
    const parseMaybeJson = <T,>(raw: unknown): T | undefined => {
      if (raw == null) return undefined;
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw) as T;
        } catch {
          return undefined;
        }
      }
      return raw as T;
    };
    const submittedBy = parseMaybeJson<{
      id: string;
      name: string;
      email: string;
      type?: string;
    }>(req.body.submittedBy);
    const context = parseMaybeJson<Record<string, string>>(req.body.context);

    if (!title?.trim() || !description?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Title and description are required" });
    }
    if (!submittedBy?.id || !submittedBy.name || !submittedBy.email) {
      return res
        .status(400)
        .json({ success: false, message: "Submitter info is required" });
    }
    if (!category?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Category is required" });
    }

    const cleanPriority: Priority = ALLOWED_PRIORITIES.includes(priority as Priority)
      ? (priority as Priority)
      : "normal";

    const ticketNumber = await generateTicketNumber();

    const ticket = await SupportTicketModel.create({
      submittedBy,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      subCategory: subCategory?.trim() || "Other",
      priority: cleanPriority,
      context: context || undefined,
      ticketNumber,
      status: "open",
      attachments,
      thread: [],
      spUnread: false,
      adminUnread: true,
    });

    // Build a richer notification line so admins triaging the notifications
    // panel know the category + priority at a glance.
    const priorityTag = cleanPriority === "normal" ? "" : ` [${cleanPriority.toUpperCase()}]`;
    const adminMessage = `New ticket${priorityTag} from ${submittedBy.name} — ${category}${
      subCategory ? ` › ${subCategory}` : ""
    }: ${ticket.title}`;

    // Legacy fan-out — keeps the AdminModel.notifications array in sync
    // with the existing admin notifications panel.
    notifyAllAdmins(adminMessage, {
      id: submittedBy.id,
      name: submittedBy.name,
    }).catch((err) => console.error("admin notify failed", err));

    // Real-time notification: socket emit + PWA push to every active admin.
    (async () => {
      const adminIds = await getActiveAdminIds();
      if (adminIds.length > 0) {
        await notifyTicketEvent({
          recipientIds: adminIds,
          recipientRole: "admin",
          message: adminMessage,
          sentBy: { id: submittedBy.id, name: submittedBy.name },
          ticketId: String(ticket._id),
          postLink: "/dashboard/admin/support",
          ctaLabel: "Open Ticket",
        });
      }
    })().catch(() => {});

    // Self-confirmation for the submitter so they see "We received your
    // ticket" on their own bell + push. submittedBy.type tells us whether
    // they're a customer ("customer") or an SP/provider.
    const submitterIsProvider =
      String(submittedBy.type || "").toLowerCase() !== "customer";
    notifyTicketEvent({
      recipientIds: [submittedBy.id],
      recipientRole: submitterIsProvider ? "provider" : "user",
      message: `Ticket received: "${ticket.title}". We'll get back to you soon.`,
      sentBy: { id: "system", name: "Tradebox Support" },
      ticketId: String(ticket._id),
      postLink: submitterIsProvider
        ? "/dashboard/serviceprovider/support"
        : "/dashboard/user/support",
      ctaLabel: "View Ticket",
    }).catch(() => {});

    return res
      .status(201)
      .json({ success: true, data: ticket, message: "Ticket created" });
  } catch (error: any) {
    console.error("createTicket error:", error);
    return res
      .status(500)
      .json({ success: false, message: error?.message || "Failed to create ticket" });
  }
};

/* ==========================================================================
   GET /api/support/tickets
   - SP: pass ?submittedById=<spId> to scope to their own tickets
   - Admin: omit submittedById to get everything; supports ?status= and ?category= filters
========================================================================== */
export const listTickets = async (req: Request, res: Response) => {
  try {
    const { submittedById, status, category, q, submitter } = req.query as Record<
      string,
      string | undefined
    >;

    const filter: any = {};
    if (submittedById) filter["submittedBy.id"] = submittedById;
    if (status && ALLOWED_STATUSES.includes(status as Status))
      filter.status = status;
    // Category is now an open string (sidebar tab name), so we no longer
    // gate the filter behind a fixed enum.
    if (category && category.trim()) filter.category = category.trim();
    if (q && q.trim()) {
      const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: safe, $options: "i" } },
        { "submittedBy.name": { $regex: safe, $options: "i" } },
      ];
    }
    // Admin can filter by submitter "kind" — SP tickets vs customer tickets.
    // We match on submittedBy.type which the frontends set to "RA"/"customer".
    // Legacy tickets without a type are assumed to be SP tickets (matches the
    // original behaviour when only SPs could file).
    if (submitter === "user") {
      filter["submittedBy.type"] = "customer";
    } else if (submitter === "sp") {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { "submittedBy.type": { $exists: false } },
            { "submittedBy.type": { $ne: "customer" } },
          ],
        },
      ];
    }

    const tickets = await SupportTicketModel.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: tickets });
  } catch (error: any) {
    console.error("listTickets error:", error);
    return res
      .status(500)
      .json({ success: false, message: error?.message || "Failed to list tickets" });
  }
};

/* ==========================================================================
   GET /api/support/tickets/:id
========================================================================== */
export const getTicketById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ticket id" });
    }
    const ticket = await SupportTicketModel.findById(id).lean();
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }
    return res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    console.error("getTicketById error:", error);
    return res
      .status(500)
      .json({ success: false, message: error?.message || "Failed to get ticket" });
  }
};

/* ==========================================================================
   POST /api/support/tickets/:id/reply
   Both SP and Admin can append messages to the thread.
   Body: { from: "sp"|"admin", fromId, fromName, text }
========================================================================== */
export const replyToTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      from,
      fromId,
      fromName,
      text,
    }: {
      from?: "sp" | "user" | "admin";
      fromId?: string;
      fromName?: string;
      text?: string;
    } = req.body;

    // Files arrive via multer-S3 when the client sends multipart. JSON callers
    // (no attachments) skip the upload middleware so req.files is undefined.
    const uploadedFiles = (req.files as Express.MulterS3.File[] | undefined) || [];
    const attachments = uploadedFiles.map((f) => f.location).filter(Boolean);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ticket id" });
    }
    if (!from || !["sp", "user", "admin"].includes(from)) {
      return res
        .status(400)
        .json({ success: false, message: "from must be 'sp', 'user', or 'admin'" });
    }
    if (!fromId || !fromName) {
      return res
        .status(400)
        .json({ success: false, message: "fromId and fromName required" });
    }
    // A message must have either text content or at least one attachment.
    const cleanedText = (text || "").trim();
    if (!cleanedText && attachments.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Message body or an image is required" });
    }

    // Flip the unread flag on the OTHER side: an admin reply makes spUnread
    // true; an SP reply makes adminUnread true.
    const unreadUpdate =
      from === "admin" ? { spUnread: true } : { adminUnread: true };

    const ticket = await SupportTicketModel.findByIdAndUpdate(
      id,
      {
        $push: {
          thread: {
            from,
            fromId,
            fromName,
            text: cleanedText,
            attachments,
          },
        },
        $set: unreadUpdate,
      },
      { new: true }
    );

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    // Notify the OTHER side that a new reply landed.
    const t = ticket as unknown as TicketDoc;
    if (from === "admin") {
      // Admin replied → notify the submitter (customer or SP).
      const submitterIsProvider =
        String(t.submittedBy.type || "").toLowerCase() !== "customer";
      // Legacy fan-out (kept for the SP/User.notifications array).
      notifySingleSP(t.submittedBy.id, `Admin replied to your ticket "${t.title}"`, {
        id: fromId,
        name: fromName,
      }).catch((err) => console.error("sp notify failed", err));

      // Real-time socket + push.
      notifyTicketEvent({
        recipientIds: [t.submittedBy.id],
        recipientRole: submitterIsProvider ? "provider" : "user",
        message: `Tradebox Support replied to your ticket "${t.title}"`,
        sentBy: { id: fromId, name: fromName },
        ticketId: String(t._id),
        postLink: submitterIsProvider
          ? "/dashboard/serviceprovider/support"
          : "/dashboard/user/support",
        ctaLabel: "View Reply",
      }).catch(() => {});
    } else {
      // Customer / SP replied → notify all admins.
      const noteMsg = `${fromName} replied on ticket "${t.title}"`;
      notifyAllAdmins(noteMsg, { id: fromId, name: fromName }).catch((err) =>
        console.error("admin notify failed", err),
      );

      (async () => {
        const adminIds = await getActiveAdminIds();
        if (adminIds.length > 0) {
          await notifyTicketEvent({
            recipientIds: adminIds,
            recipientRole: "admin",
            message: noteMsg,
            sentBy: { id: fromId, name: fromName },
            ticketId: String(t._id),
            postLink: "/dashboard/admin/support",
            ctaLabel: "Open Ticket",
          });
        }
      })().catch(() => {});
    }

    return res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    console.error("replyToTicket error:", error);
    return res
      .status(500)
      .json({ success: false, message: error?.message || "Failed to reply" });
  }
};

/* ==========================================================================
   PATCH /api/support/tickets/:id/status   (admin only)
   Body: { status, adminId, adminName }
========================================================================== */
export const updateTicketStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      adminId,
      adminName,
    }: { status?: Status; adminId?: string; adminName?: string } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ticket id" });
    }
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of ${ALLOWED_STATUSES.join(", ")}`,
      });
    }
    if (!adminId || !adminName) {
      return res
        .status(400)
        .json({ success: false, message: "adminId and adminName required" });
    }

    const update: any = { status };
    if (status === "resolved") {
      update.resolvedAt = new Date();
      update.resolvedBy = { id: adminId, name: adminName };
    } else {
      update.resolvedAt = null;
      update.resolvedBy = { id: null, name: null };
    }
    // Status changes are admin-driven; the SP needs to be notified.
    update.spUnread = true;

    const ticket = await SupportTicketModel.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    const human =
      status === "in_progress"
        ? "is being worked on"
        : status === "resolved"
          ? "has been resolved"
          : "is open";

    const t = ticket as unknown as TicketDoc;
    const submitterIsProvider =
      String(t.submittedBy.type || "").toLowerCase() !== "customer";
    const statusMsg = `Your ticket "${t.title}" ${human}`;

    // Legacy fan-out (SP/User.notifications array).
    notifySingleSP(t.submittedBy.id, statusMsg, {
      id: adminId,
      name: adminName,
    }).catch((err) => console.error("sp notify failed", err));

    // Real-time bell + push.
    notifyTicketEvent({
      recipientIds: [t.submittedBy.id],
      recipientRole: submitterIsProvider ? "provider" : "user",
      message: statusMsg,
      sentBy: { id: adminId, name: adminName },
      ticketId: String(t._id),
      postLink: submitterIsProvider
        ? "/dashboard/serviceprovider/support"
        : "/dashboard/user/support",
      ctaLabel: "View Ticket",
    }).catch(() => {});

    return res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    console.error("updateTicketStatus error:", error);
    return res
      .status(500)
      .json({ success: false, message: error?.message || "Failed to update status" });
  }
};

/* ==========================================================================
   GET /api/support/tickets/stats
   - With ?submittedById=<spId>: returns SP-scoped counts + their unread count
   - Without: returns admin-scoped totals + their unread count
========================================================================== */
export const getTicketStats = async (req: Request, res: Response) => {
  try {
    const { submittedById } = req.query as Record<string, string | undefined>;

    const filter: any = {};
    if (submittedById) filter["submittedBy.id"] = submittedById;

    const [byStatus, unreadForSP, unreadForAdmin] = await Promise.all([
      SupportTicketModel.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      submittedById
        ? SupportTicketModel.countDocuments({
            "submittedBy.id": submittedById,
            spUnread: true,
          })
        : Promise.resolve(0),
      submittedById ? Promise.resolve(0) : SupportTicketModel.countDocuments({ adminUnread: true }),
    ]);

    const stats: Record<string, number> = {
      open: 0,
      in_progress: 0,
      resolved: 0,
    };
    for (const row of byStatus) stats[row._id] = row.count;

    return res.status(200).json({
      success: true,
      data: {
        ...stats,
        total: byStatus.reduce((s, r) => s + r.count, 0),
        unreadForSP,
        unreadForAdmin,
      },
    });
  } catch (error: any) {
    console.error("getTicketStats error:", error);
    return res
      .status(500)
      .json({ success: false, message: error?.message || "Failed to get stats" });
  }
};

/* ==========================================================================
   PATCH /api/support/tickets/:id/seen
   Body: { side: "sp" | "admin" }
   The viewer is telling us they've now seen the ticket; clear their dot.
========================================================================== */
export const markTicketSeen = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { side }: { side?: "sp" | "admin" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ticket id" });
    }
    if (side !== "sp" && side !== "admin") {
      return res
        .status(400)
        .json({ success: false, message: "side must be 'sp' or 'admin'" });
    }

    const update = side === "sp" ? { spUnread: false } : { adminUnread: false };
    const ticket = await SupportTicketModel.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }
    return res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    console.error("markTicketSeen error:", error);
    return res
      .status(500)
      .json({ success: false, message: error?.message || "Failed to mark seen" });
  }
};

/* ==========================================================================
   PATCH /api/support/tickets/:id/tag   (admin only)
   Body: { tag: "bug" | "enhancement" | null, adminId, adminName }
   Lets the admin classify each ticket independently of its status. Pass
   `tag: null` to clear an existing classification.
========================================================================== */
const ALLOWED_TAGS = ["bug", "enhancement"] as const;
type AdminTag = (typeof ALLOWED_TAGS)[number];

export const tagTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      tag,
      adminId,
      adminName,
    }: {
      tag?: AdminTag | null;
      adminId?: string;
      adminName?: string;
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ticket id" });
    }
    if (!adminId || !adminName) {
      return res
        .status(400)
        .json({ success: false, message: "adminId and adminName required" });
    }

    // tag may legally be null (clears the classification) or one of the
    // allowed strings. Anything else is a bad request.
    if (tag !== null && !ALLOWED_TAGS.includes(tag as AdminTag)) {
      return res.status(400).json({
        success: false,
        message: `tag must be one of ${ALLOWED_TAGS.join(", ")} or null`,
      });
    }

    const update: Record<string, any> =
      tag === null
        ? { adminTag: null, adminTagBy: { id: null, name: null }, adminTagAt: null }
        : {
            adminTag: tag,
            adminTagBy: { id: adminId, name: adminName },
            adminTagAt: new Date(),
          };

    const ticket = await SupportTicketModel.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    return res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    console.error("tagTicket error:", error);
    return res
      .status(500)
      .json({ success: false, message: error?.message || "Failed to tag" });
  }
};
