import mongoose, { ClientSession } from "mongoose";
import { ServiceProviderRegModel } from "../models/AuthModels";
import {
  OrderModel,
  TradeboxPlansModel,
  WalletTransactionModel,
} from "../models/TransactionModels";
import { notifyWalletChange } from "./Notify";

export type DebitContext = {
  soldById: string;
  orderById: string;
  subscribedToId: string;
  subtotal: number;
  serviceName: string;
  orderByName: string;
  orderByEmail: string;
  esignClientId: string;
  session: ClientSession;
};

export type DebitResult =
  | {
      ok: true;
      amount: number;
      isRenewal: boolean;
      transactionId: mongoose.Types.ObjectId;
    }
  | {
      ok: false;
      reason: "no-subscription" | "insufficient-balance";
      amount: number;
    };

// Computes and applies the SP onboarding/renewal commission for a single
// purchase. Used by the e-sign callback to debit the SP wallet up-front,
// before the customer reaches payment. Idempotency is enforced by the caller
// via EsignSessionModel.chargeDebited.
export async function debitOnboardingCharge(
  ctx: DebitContext,
): Promise<DebitResult> {
  const sp = await ServiceProviderRegModel.findById(ctx.soldById).session(
    ctx.session,
  );
  if (!sp) {
    return { ok: false, reason: "no-subscription", amount: 0 };
  }

  const subscription = await TradeboxPlansModel.findById(
    sp.subscriptionDetails?.currentSubscription,
  ).session(ctx.session);
  if (!subscription) {
    return { ok: false, reason: "no-subscription", amount: 0 };
  }

  const hasPrevious = await OrderModel.exists({
    "soldBy.id": ctx.soldById,
    "orderdBy.id": ctx.orderById,
    subscribedToId: ctx.subscribedToId,
  }).session(ctx.session);
  const isNewCustomer = !hasPrevious;

  let amount = 0;
  if (subscription.fixedCommercialFee) {
    amount += subscription.fixedCommercialFee;
  }
  if (subscription.pricingType === "Percentage") {
    const rate =
      (isNewCustomer
        ? subscription.percentageFreshOnboarding
        : subscription.percentageRenewal) || 0;
    amount += (rate / 100) * ctx.subtotal;
  } else {
    amount += isNewCustomer
      ? subscription.fixedFreshOnboardingCharge || 0
      : subscription.fixedRenewalCharge || 0;
  }
  amount *= 1.18; // GST

  if (sp.wallet.amount < amount) {
    return { ok: false, reason: "insufficient-balance", amount };
  }

  sp.wallet.amount -= amount;
  await sp.save({ session: ctx.session });

  await notifyWalletChange({
    spId: String(sp._id),
    spName: sp.RegName,
    amount,
    direction: "debit",
    reason: isNewCustomer
      ? `Onboarding fee for ${ctx.serviceName}`
      : `Renewal fee for ${ctx.serviceName}`,
    newBalance: sp.wallet.amount,
    session: ctx.session,
  });

  const [tx] = await WalletTransactionModel.create(
    [
      {
        serviceProviderId: ctx.soldById,
        orderdBy: {
          name: ctx.orderByName,
          id: ctx.orderById,
          email: ctx.orderByEmail,
        },
        esignClientId: ctx.esignClientId,
        serviceName: ctx.serviceName,
        amount,
        type: isNewCustomer ? "Onboarding-Charge" : "Renewal-Charge",
      },
    ],
    { session: ctx.session },
  );

  return {
    ok: true,
    amount,
    isRenewal: !isNewCustomer,
    transactionId: tx._id,
  };
}
