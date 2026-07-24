import mongoose from "mongoose";
import {
  LeadModel,
  OrderModel,
  WalletTransactionModel,
  TradeboxPlansModel,
} from "../models/TransactionModels";
import { ServiceProviderRegModel, UserModel } from "../models/AuthModels";
import { ServiceModel } from "../models/PostModels";
import { Portfolio } from "../lib/schema";
import { PackageModel } from "../models/PackageModel";
import { notificationModel } from "../models/NotificationModel";
import { sendNotification } from "../helpers/sendNotification";
import { getChannelInviteLink, isUserInChannel } from "../config/telegram";
import { mailQueue } from "../queues/MailQueues";
import { InvoiceQueueService } from "../queues/InvoiceQueues";

export interface AutoRenewalParams {
  /** The mandate's plan details snapshot */
  planDetails: {
    serviceName: string;
    type: string;
    subtotal: number;
    gst: number;
    total: number;
    validity: string;
    subscribedToId: string;
    soldByName: string;
    soldById: string;
    soldByEmail?: string;
    orderByName: string;
    orderById: string;
    orderByEmail: string;
  };
  /** Razorpay payment ID from the subscription charge */
  razorpayPaymentId: string;
  /** The original order ID that started the mandate */
  previousOrderId: string;
}

export interface AutoRenewalResult {
  success: boolean;
  newOrderId?: string;
  error?: string;
}

/**
 * Process an auto-renewal.
 *
 * Mirrors the gateway path of createAndVerifyOrder:
 *   1. Mark previous order as renewed
 *   2. Calculate new end date
 *   3. Create new order
 *   4. Deduct SP wallet
 *   5. Log wallet transaction
 *   6. Update user subscription
 *   7. Generate telegram invite links
 *   8. Queue confirmation email
 *   9. Queue invoice
 */
export async function processAutoRenewal(
  params: AutoRenewalParams
): Promise<AutoRenewalResult> {
  const session = await mongoose.startSession();
  session.startTransaction();

  // Hoist for use in the catch-block renewal-failed notification (which
  // needs to identify the affected user even after destructuring scope).
  const { planDetails } = params;
  const { serviceName, orderById } = planDetails;

  try {
    const { razorpayPaymentId, previousOrderId } = params;
    const {
      type,
      subtotal,
      gst,
      total,
      validity,
      subscribedToId,
      soldByName,
      soldById,
      soldByEmail,
      orderByName,
      orderByEmail,
    } = planDetails;

    /* ---------- FETCH USER & PROVIDER ---------- */

    const [user, serviceProvider] = await Promise.all([
      UserModel.findById(orderById),
      ServiceProviderRegModel.findById(soldById),
    ]);

    if (!user) {
      await session.abortTransaction();
      return { success: false, error: "User not found" };
    }

    if (!serviceProvider) {
      await session.abortTransaction();
      return { success: false, error: "Service provider not found" };
    }

    /* ---------- RENEWAL LOGIC ---------- */

    let extendedEndDate: Date | null = null;
    const previousOrder = await OrderModel.findById(previousOrderId).session(
      session
    );

    if (previousOrder) {
      const today = new Date();
      const previousEndDate = new Date(previousOrder.endDate || today);
      const baseDate = previousEndDate > today ? previousEndDate : today;
      const newEnd = new Date(baseDate);

      if (type === "portfolio") {
        const validityMatch = validity?.match(/(\d+)\s*(month|year)/i);
        if (validityMatch) {
          const num = parseInt(validityMatch[1]) || 0;
          const unit = validityMatch[2].toLowerCase();
          if (unit.startsWith("year")) {
            newEnd.setFullYear(newEnd.getFullYear() + num);
          } else {
            newEnd.setMonth(newEnd.getMonth() + num);
          }
        }
      } else {
        const validityDays = Number(validity) || 0;
        newEnd.setDate(newEnd.getDate() + validityDays);
      }

      previousOrder.isRenewed = true;
      previousOrder.renewedAt = new Date();
      previousOrder.endDate = newEnd;
      await previousOrder.save({ session });
      extendedEndDate = newEnd;
    }

    /* ---------- END DATE FOR NEW ORDER ---------- */

    const orderEndDate = new Date();
    if (type === "portfolio") {
      const validityMatch = validity?.match(/(\d+)\s*(month|year)/i);
      if (validityMatch) {
        const num = parseInt(validityMatch[1]) || 0;
        const unit = validityMatch[2].toLowerCase();
        if (unit.startsWith("year")) {
          orderEndDate.setFullYear(orderEndDate.getFullYear() + num);
        } else {
          orderEndDate.setMonth(orderEndDate.getMonth() + num);
        }
      }
    } else {
      const validityDays = Number(validity) || 0;
      orderEndDate.setDate(orderEndDate.getDate() + validityDays);
    }

    /* ---------- WALLET DEDUCTION ---------- */

    let amountToBeDeducted = 0;

    const subscription = await TradeboxPlansModel.findById(
      serviceProvider.subscriptionDetails?.currentSubscription
    );

    if (subscription) {
      const hasPreviousOrder = await OrderModel.exists({
        "soldBy.id": soldById,
        "orderdBy.id": orderById,
        subscribedToId,
      });

      const isNewCustomer = !hasPreviousOrder;

      if (subscription.fixedCommercialFee) {
        amountToBeDeducted += subscription.fixedCommercialFee;
      }

      if (subscription.pricingType === "Percentage") {
        amountToBeDeducted +=
          (((isNewCustomer
            ? subscription.percentageFreshOnboarding
            : subscription.percentageRenewal) || 0) /
            100) *
          subtotal;
      } else {
        amountToBeDeducted += isNewCustomer
          ? subscription.fixedFreshOnboardingCharge || 0
          : subscription.fixedRenewalCharge || 0;
      }

      amountToBeDeducted *= 1.18; // GST

      if (serviceProvider.wallet.amount < amountToBeDeducted) {
        console.warn(
          `[AUTO-RENEWAL] Insufficient SP wallet balance for mandate renewal.` +
            ` SP: ${soldById}, needed: ${amountToBeDeducted}, balance: ${serviceProvider.wallet.amount}`
        );
        // Don't fail — log warning and skip wallet deduction
        // The SP needs to top up, but user should still get service renewed
      } else {
        serviceProvider.wallet.amount -= amountToBeDeducted;
        await serviceProvider.save({ session });
      }
    }

    /* ---------- FETCH PURCHASED ITEM ---------- */

    let purchasedItem: any;

    if (type === "service") {
      purchasedItem = await ServiceModel.findById(subscribedToId);
    } else if (type === "portfolio") {
      purchasedItem = await Portfolio.findById(subscribedToId);
    } else if (type === "package") {
      purchasedItem = await PackageModel.findById(subscribedToId).populate(
        "includedServices"
      );
    }

    /* ---------- TELEGRAM INVITE LINKS ---------- */

    let telegramInviteLink: string | null = null;
    let telegramInviteLinks: { serviceName: string; link: string }[] = [];

    if (purchasedItem) {
      const userTelegramId = user?.telegramUserId;

      if (type === "service" && purchasedItem.telegramChannelId) {
        let skipInviteLink = false;
        if (userTelegramId) {
          skipInviteLink = await isUserInChannel(
            purchasedItem.telegramChannelId,
            userTelegramId
          );
        }
        if (!skipInviteLink) {
          const invite = await getChannelInviteLink(
            purchasedItem.telegramChannelId,
            "pending",
            subscribedToId,
            orderById
          );
          if (invite?.link) telegramInviteLink = invite.link;
        }
      }

      if (type === "package") {
        for (const svc of purchasedItem.includedServices || []) {
          if (!svc.telegramChannelId) continue;
          let skipInviteLink = false;
          if (userTelegramId) {
            skipInviteLink = await isUserInChannel(
              svc.telegramChannelId,
              userTelegramId
            );
          }
          if (!skipInviteLink) {
            const invite = await getChannelInviteLink(
              svc.telegramChannelId,
              "pending",
              subscribedToId,
              orderById
            );
            if (invite?.link) {
              telegramInviteLinks.push({
                serviceName: svc.title,
                link: invite.link,
              });
            }
          }
        }
      }
    }

    /* ---------- CREATE NEW ORDER ---------- */

    const order = await new OrderModel({
      subscribedToId,
      serviceName,
      orderdBy: {
        name: orderByName,
        id: orderById,
        email: orderByEmail,
      },
      soldBy: { name: soldByName, id: soldById },
      paymentId: razorpayPaymentId,
      subtotal,
      gst,
      total,
      paymentMethod: "Auto-Renewal",
      validity,
      type,
      verifiedByRa: true,
      paymentStatus: "verified",
      isRenewal: true,
      previousOrderId,
      startDate: new Date(),
      endDate: extendedEndDate || orderEndDate,
      telegramInviteLink,
      telegramInviteLinks,
    }).save({ session });

    /* ---------- WALLET TRANSACTION ---------- */

    if (amountToBeDeducted > 0) {
      await WalletTransactionModel.create(
        [
          {
            serviceProviderId: soldById,
            orderdBy: {
              name: orderByName,
              id: orderById,
              email: orderByEmail,
            },
            paymentId: razorpayPaymentId,
            orderId: order._id.toString(),
            amount: amountToBeDeducted,
            type: "Renewal-Charge",
          },
        ],
        { session }
      );
    }

    /* ---------- DELETE LEAD ---------- */

    await LeadModel.findOneAndDelete(
      {
        userId: orderById,
        serviceId: subscribedToId,
        providerId: soldById,
      },
      { session }
    );

    /* ---------- UPDATE USER SUBSCRIPTIONS ---------- */

    await UserModel.findByIdAndUpdate(
      orderById,
      {
        $addToSet: {
          "ServicesAndOrders.services": subscribedToId,
          "ServicesAndOrders.orders": order._id,
        },
      },
      { session }
    );

    if (type === "service") {
      await ServiceModel.findByIdAndUpdate(subscribedToId, {
        $addToSet: { subscribedBy: orderById },
      });
    }

    if (type === "portfolio") {
      await Portfolio.findByIdAndUpdate(subscribedToId, {
        $addToSet: { subscribedBy: orderById },
      });
    }

    if (type === "package" && purchasedItem) {
      await Promise.all(
        (purchasedItem.includedServices || []).map((svc: any) =>
          ServiceModel.findByIdAndUpdate(svc._id, {
            $addToSet: { subscribedBy: orderById },
          })
        )
      );
    }

    /* ---------- NOTIFICATIONS ---------- */

    await new notificationModel({
      message: `${orderByName}'s plan ${serviceName} has been auto-renewed`,
      sendTo: [{ id: soldById, name: soldByName }],
      sentBy: { id: "system", name: "System" },
      type: "service",
    }).save({ session });

    /* ---------- COMMIT ---------- */

    await session.commitTransaction();

    /* ---------- EMAIL (post-commit, non-blocking) ---------- */

    let telegramHtml = "";
    if (telegramInviteLink) {
      telegramHtml = `
        <div style="text-align:center;margin:30px 0;">
          <a href="${telegramInviteLink}"
            style="background:#0088cc;color:#fff;padding:12px 24px;border-radius:5px;
            text-decoration:none;font-weight:bold;">
            Join Telegram Channel
          </a>
        </div>`;
    }
    if (telegramInviteLinks.length) {
      telegramHtml = telegramInviteLinks
        .map(
          (i) => `
        <div style="text-align:center;margin:10px 10px;">
          <a href="${i.link}" style="background:#0088cc;color:#fff;padding:12px 24px;border-radius:5px;text-decoration:none;">
            Join ${i.serviceName}
          </a>
        </div>`
        )
        .join("");
    }

    try {
      await mailQueue.add(
        user.email,
        {
          mailOptions: {
            from: process.env.EMAIL,
            to: user.email,
            cc: serviceProvider.email,
            subject: `Auto-Renewal Confirmation for ${serviceName}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 0 20px;">
                <h2 style="text-align: left;">Auto-Renewal Confirmation</h2>
                <div style="background:#f0fdf4;padding:15px;border-radius:8px;margin:20px 0;border-left:4px solid #22c55e;">
                  <p style="margin:0;color:#166534;font-weight:bold;">✅ Auto-Renewal Successful</p>
                  <p style="margin:5px 0 0;color:#166534;">
                    Your plan has been automatically renewed via UPI Auto-Pay.
                  </p>
                </div>
                <div style="padding: 10px 0;">
                  <h4 style="padding-bottom: 5px;">Renewed for:</h4>
                  <h5>Name: <span>${user.name}</span></h5>
                  <h5>Email: <span>${user.email}</span></h5>
                  <h5>Renewal Date: <span>${new Date().toLocaleDateString("en-IN")}</span></h5>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">Plan Name</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${serviceName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">Price</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${subtotal}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">GST (18%)</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${gst}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">Total Amount</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${total}</td>
                  </tr>
                </table>
                ${telegramHtml}
                <p style="margin-top: 20px; font-size: 14px; color: #555;">
                  This renewal was processed automatically via your UPI Auto-Pay mandate.
                  You can cancel auto-renewal at any time from your account settings.
                </p>
                <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
            
                </p>
              </div>
            `,
          },
        },
        { removeOnComplete: false, removeOnFail: false }
      );
    } catch (err) {
      console.error("[AUTO-RENEWAL] Mail queue failed:", order._id, err);
    }

    /* ---------- INVOICE (post-commit, non-blocking) ---------- */

    try {
      await InvoiceQueueService.add(
        "invoice-queue-service",
        {
          orderId: order._id.toString(),
          userType: "user",
          serviceId: subscribedToId,
          serviceName,
          serviceProviderName: soldByName,
          serviceProviderId: soldById,
          serviceprovideremail: serviceProvider.email,
          serviceProviderAddress: [serviceProvider.city, serviceProvider.state].filter(Boolean).join(", "),
          serviceProviderRegistrationNumber: serviceProvider.regNumber,
          serviceProviderWebsite: serviceProvider.website,
          serviceProviderGST: serviceProvider.gst || "",
          serviceProviderHSN: serviceProvider.hsnCode || "",
          serviceProviderPhone: serviceProvider.number,
          serviceProviderState: serviceProvider.state,
          buyerId: user._id,
          buyerName: user.name,
          buyerNumber: user.number,
          buyerEmail: user.email,
          buyerPan: user.pannumber || "",
          subtotal,
          gst,
          total,
          validity:
            type !== "portfolio" &&
            !String(validity).toLowerCase().includes("day")
              ? `${validity} days`
              : validity,
          issueDate: order.createdAt,
          serviceStartDate: order.startDate,
          serviceEndDate: order.endDate,
        },
        { removeOnComplete: false, removeOnFail: false }
      );
    } catch (err) {
      console.error("[AUTO-RENEWAL] Invoice queue failed:", order._id, err);
    }

    console.log(
      `[AUTO-RENEWAL] Successfully renewed order for user ${orderById}, ` +
        `service ${serviceName}, new order: ${order._id}`
    );

    // Notify the user that their subscription has auto-renewed (post-commit,
    // best-effort — never throws into the caller).
    await sendNotification({
      recipientIds: [String(orderById)],
      recipientRole: "user",
      message: `Your subscription for ${serviceName} has been auto-renewed.`,
      type: "renewal-success",
      category: "admin",
      sentBy: { id: "admin", name: "Tradebox" },
      postLink: "/dashboard/user/subscribedservices",
      ctaLabel: "View Subscription",
    });

    return { success: true, newOrderId: order._id.toString() };
  } catch (error) {
    await session.abortTransaction();
    console.error("[AUTO-RENEWAL] Error:", error);
    // Notify the user that auto-renewal failed so they can retry manually.
    try {
      await sendNotification({
        recipientIds: [String(orderById)],
        recipientRole: "user",
        message: `Auto-renewal for ${serviceName} failed. Please renew manually to continue access.`,
        type: "renewal-failed",
        category: "admin",
        sentBy: { id: "admin", name: "Tradebox" },
        postLink: "/dashboard/user/subscribedservices",
        ctaLabel: "Retry Renewal",
      });
    } catch {
      // never let notification path swallow the underlying error
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    session.endSession();
  }
}
