import { OrderModel } from "../models/TransactionModels";
import { UserModel } from "../models/AuthModels";

/**
 * Active subscribers = unique buyers with a non-expired order for this portfolio
 * id. The stored `subscribedBy` array on the portfolio is unreliable, so order
 * history is the canonical source. We don't filter by `type: "portfolio"`
 * because subscribedToId is a unique ObjectId — only portfolio orders can match
 * a portfolio's id — and the extra filter would silently exclude legacy orders
 * written before `type` was reliably set.
 */
export async function getActiveSubscriberEmails(
  portfolioId: string
): Promise<string[]> {
  const orders = await OrderModel.find({
    subscribedToId: String(portfolioId),
    isExpired: { $ne: true },
  }).select("orderdBy.id");

  const userIds = Array.from(
    new Set(orders.map((o: any) => o.orderdBy?.id).filter(Boolean))
  );

  if (userIds.length === 0) return [];

  const users = await UserModel.find({ _id: { $in: userIds } }).select("email");
  return users.map((u: any) => u.email).filter(Boolean);
}
