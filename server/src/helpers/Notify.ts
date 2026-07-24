import { sendBotAdminMessage } from "../config/telegram";
import { AdminModel } from "../models/AuthModels";
import { notificationModel } from "../models/NotificationModel";
import type { ClientSession } from "mongoose";

// Sends a system-originated in-app notification to an SP every time their
// Tradebox wallet balance changes (top-up, admin recharge, admin deduction,
// or any automatic deduction during a customer payment flow). Pass `session`
// when called from inside a transaction so the notification commits with the
// wallet write — otherwise the SP could see "wallet credited" for a balance
// change that got rolled back.
export async function notifyWalletChange(opts: {
  spId: string;
  spName?: string;
  amount: number;
  direction: "credit" | "debit";
  reason: string;
  newBalance?: number;
  session?: ClientSession;
}) {
  const formattedAmount = `₹${Math.round(opts.amount).toLocaleString("en-IN")}`;
  const balancePart =
    typeof opts.newBalance === "number"
      ? ` New balance: ₹${Math.round(opts.newBalance).toLocaleString("en-IN")}.`
      : "";
  const verb = opts.direction === "credit" ? "credited" : "debited";
  const preposition = opts.direction === "credit" ? "to" : "from";
  const message = `${formattedAmount} ${verb} ${preposition} your Tradebox wallet — ${opts.reason}.${balancePart}`;

  const noti = new notificationModel({
    message,
    sendTo: [{ id: opts.spId, name: opts.spName || "" }],
    sentBy: { id: "system", name: "System" },
    type: "wallet",
  });

  if (opts.session) await noti.save({ session: opts.session });
  else await noti.save();
}

export async function adminNotify(message: string) {
  const admins = await AdminModel.find({});

  const sendToList = admins.map((admin) => {
    return {
      id: admin._id,
      name: admin.name,
    };
  });

  const AdminNotify = new notificationModel({
    message,
    sendTo: sendToList,
    sentBy: {
      id: "system",
      name: "system",
    },
    type: "admin",
  });

  await AdminNotify.save();

  await sendBotAdminMessage(message);
}
