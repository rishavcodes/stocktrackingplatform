import { Request, Response } from "express";
import RazorpayInit from "../config/RazorpayInit";
import { MandateModel } from "../models/MandateModel";
import { logOnboardingIssue } from "../lib/onboardingIssueLogger";
import {
  calculateBillingCycle,
  createRazorpayPlan,
  createRazorpaySubscription,
  fetchRazorpaySubscription,
} from "../helpers/razorpaySubscription";
import crypto from "crypto";
import {
  LeadModel,
  OrderModel,
  PaymentDetailsModel,
  PromoCodeTrackerModel,
  TradeboxPlansModel,
  WalletTransactionModel,
  WithdrawalModel,
} from "../models/TransactionModels";
import { ServiceProviderRegModel, UserModel } from "../models/AuthModels";
import { ServiceModel, EventModel, CouponModel, EventRegistrationModel } from "../models/PostModels";
import { isOnline } from "../helpers/presence";
import { invalidateServiceNameCache } from "../services/ServiceNameCache";
import { adminNotify, notifyWalletChange } from "../helpers/Notify";
import { sendNotification } from "../helpers/sendNotification";
import { notificationModel } from "../models/NotificationModel";
import {
  InvoiceQueueService,
  InvoiceQueueTradeboxPlans,
} from "../queues/InvoiceQueues";
import { Model } from "mongoose";
import { getChannelInviteLink, isUserInChannel } from "../config/telegram";
// import TelegramBot from "node-telegram-bot-api";
import { Api } from "telegram";
import { TelegramClient } from "telegram";
import { parse } from "path";
import extractAddressFromXML from "../helpers/extractAddressFromXML";
import { mailQueue } from "../queues/MailQueues";
import mongoose from "mongoose";
import { RazorpayKeyModel, CashfreeKeyModel } from "../models/IntegrationModels";
import { createCashfreeOrder, getCashfreeOrderStatus } from "../helpers/cashfreeCheckout";
import Razorpay from "razorpay";
import { Portfolio } from "../lib/schema";
import GetFilesFromS3 from "../helpers/GetFilesFromS3";
import { generateInvoiceNumber } from "../helpers/generateInvoiceNumber";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { ToWords } from "to-words";
import saveInvoiceToS3 from "../helpers/saveInvoiceToS3";
import { transporter } from "../helpers/nodemailer";
import { CourseModel } from "../models/CourseModel";
import { CourseOrderModel } from "../models/CourseOrder";
import { EnrollmentModel } from "../models/Enrollment";
import { PackageModel } from "../models/PackageModel";
import { MarketplaceModel } from "../models/MarketplaceModel";
import { EsignSessionModel } from "../models/EsignSessionModel";
import { debitOnboardingCharge } from "../helpers/walletDebit";
import { validateCoupon, redeemCoupon } from "../helpers/validateCoupon";
import { assertFreeOrderEligible } from "../helpers/freeOrderGuard";
import { getProfileFamilyIds } from "../utils/profileHelpers";

let client: TelegramClient;

type AnyModel = typeof ServiceModel | typeof EventModel;

/**
 * Server-side backstop for the PAN/Aadhaar identity match. The checkout page
 * already blocks the user from reaching the payment step on a mismatch, but a
 * tampered client could skip that — so we re-check here using the most recent
 * COMPLETED eSign session for this user + service.
 *
 * Returns a 403-style payload to send back when the gate fails; null when the
 * caller can proceed.
 */
async function assertMatchedEsignOrReject(
  userId: string,
  serviceId: string
): Promise<{ status: number; body: any } | null> {
  if (!userId || !serviceId) {
    return {
      status: 400,
      body: {
        success: false,
        message: "userId and serviceId are required for payment verification",
      },
    };
  }

  const esignSession = await EsignSessionModel.findOne({
    userId,
    serviceId,
    status: { $in: ["COMPLETED", "PAYMENT_BLOCKED"] },
  }).sort({ updatedAt: -1 });

  if (esignSession?.status === "PAYMENT_BLOCKED") {
    return {
      status: 403,
      body: {
        success: false,
        code: "SP_INSUFFICIENT_WALLET",
        message:
          "This service is temporarily unavailable for new purchases. Please try again later or contact the service provider.",
      },
    };
  }

  if (!esignSession || esignSession.aadhaarMatchStatus !== "matched") {
    return {
      status: 403,
      body: {
        success: false,
        message:
          "Aadhaar verification incomplete or failed. Please complete the e-sign again.",
        aadhaarMatchStatus: esignSession?.aadhaarMatchStatus ?? "missing",
      },
    };
  }

  return null;
}

export const paymentCheckOut = async (req: Request, res: Response) => {
  const { amount, spId, autoRenew, serviceName, validity, type, buyerId, buyerPhone, buyerEmail, buyerName } = req.body;

  if (!amount || !spId) {
    return res.status(400).json({
      success: false,
      message: "Amount and Service Provider ID are required",
    });
  }

  try {
    const sp = await ServiceProviderRegModel.findById(spId)
      .select("services razorpayKey cashfreeKey wallet subscriptionDetails")
      .lean();

    if (!sp) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    /* ---------------- WALLET PRE-CHECK ----------------
       Refuse to create a gateway order if the SP cannot cover the commission
       this purchase will trigger. If we let the customer pay first and the
       wallet check at verify-time fails, the customer is debited but no
       order/email/Telegram-link is delivered. Block at the gate instead.
    */
    {
      const walletBalance = (sp as any).wallet?.amount ?? 0;

      const subscription = await TradeboxPlansModel.findById(
        (sp as any).subscriptionDetails?.currentSubscription
      ).lean();

      if (!subscription) {
        console.warn(
          `[checkout] SP ${spId} has no active subscription — refusing checkout. wallet=${walletBalance}`
        );
        return res.status(400).json({
          success: false,
          code: "SP_NO_SUBSCRIPTION",
          message:
            "This service provider can't accept new purchases right now. Please try again later.",
        });
      }

      // amount is GST-inclusive paise; back out subtotal in rupees.
      const subtotalRupees = parseFloat(amount) / 100 / 1.18;

      // Be conservative: check using the "fresh onboarding" rate (which is
      // typically >= renewal rate). If they can afford fresh, they can afford
      // renewal. Avoids a DB lookup here just to detect renewal.
      let commission = 0;
      if ((subscription as any).fixedCommercialFee) {
        commission += (subscription as any).fixedCommercialFee;
      }
      if ((subscription as any).pricingType === "Percentage") {
        const pct = (subscription as any).percentageFreshOnboarding ?? 0;
        commission += (subtotalRupees * pct) / 100;
      } else {
        commission += (subscription as any).fixedFreshOnboardingCharge ?? 0;
      }
      commission *= 1.18; // GST on commission

      console.log(
        `[checkout] SP ${spId} wallet=${walletBalance}, commissionDue=${commission.toFixed(2)}, subtotal=${subtotalRupees.toFixed(2)}, plan=${(subscription as any).plan}, pricingType=${(subscription as any).pricingType}`
      );

      // Two-part guard:
      //   (a) wallet must cover the calculated commission, AND
      //   (b) when subscription has any non-zero fee configured, wallet must be > 0
      //       (catches edge cases where commission rounds to 0 or fees aren't set).
      const hasAnyFee =
        ((subscription as any).fixedCommercialFee ?? 0) > 0 ||
        ((subscription as any).fixedFreshOnboardingCharge ?? 0) > 0 ||
        ((subscription as any).fixedRenewalCharge ?? 0) > 0 ||
        ((subscription as any).percentageFreshOnboarding ?? 0) > 0 ||
        ((subscription as any).percentageRenewal ?? 0) > 0;

      const insufficient =
        walletBalance < commission || (hasAnyFee && walletBalance <= 0);

      if (insufficient) {
        console.warn(
          `[checkout] SP ${spId} wallet insufficient: balance=${walletBalance}, commissionDue=${commission.toFixed(2)} — refusing checkout`
        );
        return res.status(400).json({
          success: false,
          code: "SP_INSUFFICIENT_WALLET",
          message:
            "This service is temporarily unavailable for new purchases. Please try again later or contact the service provider.",
        });
      }
    }

    const integration = (sp as any).services?.integration || "razorpay";

    /* ================ CASHFREE FLOW ================ */
    if (integration === "cashfree") {
      const cashfreeKeyEntry = await CashfreeKeyModel.findOne({ userId: spId });

      if (!cashfreeKeyEntry || !cashfreeKeyEntry.appId || !cashfreeKeyEntry.secretKey) {
        return res.status(404).json({
          success: false,
          message: "Cashfree keys not found for this service provider",
        });
      }

      const orderId = `cf_${spId}_${Date.now()}`;
      const orderAmount = parseFloat(amount) / 100; // convert paise to rupees for Cashfree

      const cfOrder = await createCashfreeOrder({
        appId: cashfreeKeyEntry.appId,
        secretKey: cashfreeKeyEntry.secretKey,
        orderId,
        orderAmount,
        orderCurrency: "INR",
        customerDetails: {
          customer_id: String(buyerId || `cust_${Date.now()}`),
          customer_phone: String(buyerPhone || "9999999999"),
          customer_email: String(buyerEmail || ""),
          customer_name: String(buyerName || ""),
        },
      });

      return res.status(200).json({
        success: true,
        gateway: "cashfree",
        cfOrderId: cfOrder.cf_order_id,
        orderId: cfOrder.order_id,
        paymentSessionId: cfOrder.payment_session_id,
      });
    }

    /* ================ RAZORPAY FLOW (default) ================ */
    const razorpayKeyEntry = await RazorpayKeyModel.findOne({ userId: spId });

    if (
      !razorpayKeyEntry ||
      !razorpayKeyEntry.keyId ||
      !razorpayKeyEntry.keySecret
    ) {
      return res.status(404).json({
        success: false,
        message: "Razorpay keys not found for this service provider",
      });
    }

    if (autoRenew) {
      const { period, interval } = calculateBillingCycle(
        validity || "30",
        type || "service"
      );

      const plan = await createRazorpayPlan(
        {
          name: serviceName || "Auto-Renewal Plan",
          amountInPaise: parseInt(amount),
          period,
          interval,
        },
        razorpayKeyEntry.keyId,
        razorpayKeyEntry.keySecret
      );

      const subscription = await createRazorpaySubscription(
        {
          planId: plan.id,
          totalCount: 120,
          notes: { spId: spId ?? "" },
        },
        razorpayKeyEntry.keyId,
        razorpayKeyEntry.keySecret
      );

      return res.status(200).json({
        success: true,
        gateway: "razorpay",
        isSubscription: true,
        subscriptionId: subscription.id,
        razorpayPlanId: plan.id,
        razorpayKeyId: razorpayKeyEntry.keyId,
      });
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyEntry.keyId,
      key_secret: razorpayKeyEntry.keySecret,
    });

    const checkout = await razorpay.orders.create({
      amount: parseInt(amount),
      currency: "INR",
    });

    return res.status(200).json({
      success: true,
      gateway: "razorpay",
      message: "Checkout created",
      checkout,
      razorpayKeyId: razorpayKeyEntry.keyId,
    });
  } catch (error) {
    console.error("Error in checkout:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create checkout",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * POST /api/payment/topupcheckout
 * Wallet top-up only. Uses company Razorpay keys (RAZORPAY_API_KEY / RAZORPAY_SECRET).
 * Body: { amount: number } — amount in paise
 */
export const topupCheckout = async (req: Request, res: Response) => {
  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({
      success: false,
      message: "Amount is required",
    });
  }

  const keyId = process.env.RAZORPAY_API_KEY ?? "";
  const keySecret = process.env.RAZORPAY_SECRET ?? "";

  if (!keyId || !keySecret) {
    return res.status(500).json({
      success: false,
      message: "Company Razorpay keys not configured (RAZORPAY_API_KEY / RAZORPAY_SECRET)",
    });
  }

  try {
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const checkout = await razorpay.orders.create({
      amount: parseInt(amount, 10),
      currency: "INR",
    });

    return res.status(200).json({
      success: true,
      message: "Top-up checkout created",
      checkout,
      razorpayKeyId: keyId,
    });
  } catch (error) {
    console.error("Error in top-up checkout:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create top-up checkout",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * POST /api/payment/checkout
 * Body: { amount: number, spId?: string, courseId?: string }
 *
 * NOTE: `amount` expected in rupees (decimal or integer). We convert to paise for Razorpay.
 * Backend returns `checkout` (razorpay order object) and `razorpayKeyId` (public key).
 */

export const checkoutRzp = async (req: Request, res: Response) => {
  try {
    const { amount, spId, courseId, autoRenew, serviceName, validity, type } = req.body ?? {};

    if (amount === undefined || amount === null) {
      return res
        .status(400)
        .json({ success: false, message: "Amount is required" });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

    const keyId = process.env.RAZORPAY_API_KEY;
    const keySecret = process.env.RAZORPAY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay keys missing in env");
      return res.status(500).json({
        success: false,
        message: "Payment gateway not configured",
      });
    }

    // create razorpay instance
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Razorpay expects amount in paise (smallest currency unit).
    // Accept decimal rupees from frontend; convert to integer paise
    const amountInPaise = Math.round(numericAmount * 100);

    /* -------- AUTO-RENEW: Create Razorpay Subscription -------- */
    if (autoRenew) {
      const { period, interval } = calculateBillingCycle(
        validity || "30",
        type || "service"
      );

      const plan = await createRazorpayPlan({
        name: serviceName || "Auto-Renewal Plan",
        amountInPaise,
        period,
        interval,
      });

      const subscription = await createRazorpaySubscription({
        planId: plan.id,
        totalCount: 120, // ~10 years max, user can cancel anytime
        notes: { spId: spId ?? "", courseId: courseId ?? "" },
      });

      return res.json({
        success: true,
        isSubscription: true,
        subscriptionId: subscription.id,
        razorpayPlanId: plan.id,
        razorpayKeyId: keyId,
      });
    }

    /* -------- REGULAR: Create Razorpay Order -------- */

    // Create unique receipt id (you can adapt to use your DB id/uuid)
    const receiptId = `rcpt_${Date.now()}`;

    const orderOptions = {
      amount: amountInPaise, // e.g. 49900 = ₹499.00
      currency: "INR",
      receipt: receiptId,
      payment_capture: 1, // auto-capture. change to 0 for manual capture
      notes: {
        spId: spId ?? "",
        courseId: courseId ?? "",
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    // return order and public key
    return res.json({
      success: true,
      checkout: order,
      razorpayKeyId: keyId,
    });
  } catch (err: any) {
    console.error("checkoutRzp error:", err);
    // Razorpay errors often come with statusCode and error details
    return res.status(500).json({
      success: false,
      message: err?.message || "Failed to create checkout order",
    });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET as string;

    const shasum = crypto.createHmac("sha256", SECRET);

    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (digest !== req.headers["x-razorpay-signature"]) {
      return res.status(500).json({
        success: false,
        message: "Failed to verify signature not matched",
      });
    }

    if (!req.body.payload.payment.entity) {
      return res.status(500).json({
        success: false,
        message: "Failed to verify no entity",
      });
    }

    const fetchedOrder = req.body.payload.payment.entity;

    const buyerId = fetchedOrder.notes.buyerId;

    const id = fetchedOrder.notes.orderId;

    if (!id) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Order ID is required" });
    }

    // Find the order by ID
    const order = await OrderModel.findById(id).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Update the order's verifiedByRa field
    order.verifiedByRa = true;
    order.startDate = new Date();
    // Extract number of days from validity (e.g., "30 days", "60 days")
    const daysMatch = order.validity?.match(/\d+/);
    const daysToAdd = daysMatch ? parseInt(daysMatch[0], 10) : 0;

    if (daysToAdd) {
      const endDate = new Date(order.startDate);
      endDate.setDate(endDate.getDate() + daysToAdd);
      order.endDate = endDate;
    }
    await order.save({ session });

    await UserModel.findByIdAndUpdate(
      order?.orderdBy?.id,
      {
        $addToSet: {
          "ServicesAndOrders.services": order?.subscribedToId,
          "ServicesAndOrders.orders": order._id,
        },
      },
      { session }
    );

    // **User Notifications**
    await new notificationModel({
      message: order.isRenewal
        ? `${order.orderdBy?.name} has renewed your plan ${order.serviceName}`
        : `${order.orderdBy?.name} has purchased your plan ${order.serviceName}`,
      sendTo: [{ id: order.soldBy?.id, name: order.soldBy?.name }],
      sentBy: { id: order.orderdBy?.id, name: order.orderdBy?.name },
      type: "service",
    }).save({ session });

    const serviceProvider = await ServiceProviderRegModel.findById(
      order.soldBy?.id
    ).session(session);

    if (!serviceProvider) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Service provider not found" });
    }

    const subscription = await TradeboxPlansModel.findById(
      serviceProvider?.subscriptionDetails?.currentSubscription
    ).session(session);

    if (!subscription) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Service provider has no active subscription",
      });
    }

    let amountToBeDeducted = 0;
    const isNewCustomer = !serviceProvider.ServicesAndOrders?.orders?.some(
      (orderId) => orderId.toString() === order.orderdBy?.id.toString()
    );

    if (
      subscription.fixedCommercialFee &&
      subscription.fixedCommercialFee > 0
    ) {
      amountToBeDeducted += subscription.fixedCommercialFee;
    }

    // Calculate amount to be deducted based on subscription plan
    if (subscription.plan === "Prepaid") {
      // For Prepaid plan

      // Check if customer limit is exceeded and add additional charge
      const currentCustomerCount =
        serviceProvider.ServicesAndOrders?.orders?.length || 0;

      const customerLimit = subscription && subscription?.customerLimit;

      if (customerLimit) {
        if (currentCustomerCount >= customerLimit) {
          // Customer limit exceeded, apply additional charge
          amountToBeDeducted += subscription.renewalCharge || 0;
        } else if (isNewCustomer) {
          // New customer within limit, apply fresh onboarding charge
          amountToBeDeducted += subscription.freshOnboardingCharge || 0;
        }
      }

      // Update customer count in subscription
      await subscription.updateOne(
        {
          currentCustomerCount: currentCustomerCount + 1,
        },
        { session }
      );
    } else if (subscription.plan === "Postpaid") {
      // For Postpaid plan

      if (subscription.pricingType === "Percentage" && order.subtotal) {
        // Percentage-based pricing
        const amountExcludingGst = order.subtotal;
        if (isNewCustomer && subscription.percentageFreshOnboarding) {
          // For fresh onboarding
          const percentageDeduction =
            (subscription.percentageFreshOnboarding / 100) * amountExcludingGst;
          amountToBeDeducted += percentageDeduction;
        } else if (!isNewCustomer && subscription.percentageRenewal) {
          // For renewal
          const percentageDeduction =
            (subscription.percentageRenewal / 100) * amountExcludingGst;
          amountToBeDeducted += percentageDeduction;
        }
      } else {
        // Fixed pricing
        if (isNewCustomer) {
          // For fresh onboarding
          amountToBeDeducted += subscription.fixedFreshOnboardingCharge || 0;
        } else {
          // For renewal
          amountToBeDeducted += subscription.fixedRenewalCharge || 0;
        }
      }
    }

    const serviceTaker = await UserModel.findById(order.orderdBy?.id).session(
      session
    );
    // console.log(serviceTaker)

    if (!serviceTaker) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Service taker not found" });
    }

    // const userXmlUrl = order?.kycDetails?.aadhaarUrl; // Assuming the XML URL is stored here

    // if (!userXmlUrl) {
    //   return res
    //     .status(404)
    //     .json({ success: false, message: "xml url not found" });
    // }

    // const userAddress = await extractAddressFromXML(userXmlUrl);

    // if (!userAddress) {
    //   return res
    //     .status(400)
    //     .json({ success: false, message: "Unable to extract address" });
    // }

    // Add 18% GST to the calculated amount
    amountToBeDeducted *= 1.18;

    if (serviceProvider.wallet.amount > amountToBeDeducted) {
      serviceProvider.wallet.amount -= amountToBeDeducted;
      await serviceProvider.save({ session });
      await notifyWalletChange({
        spId: String(serviceProvider._id),
        spName: serviceProvider.RegName,
        amount: amountToBeDeducted,
        direction: "debit",
        reason: order.isRenewal
          ? `renewal commission for ${order.serviceName}`
          : `onboarding commission for ${order.serviceName}`,
        newBalance: serviceProvider.wallet.amount,
        session,
      });
    } else {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Insufficient funds to cover additional fee",
      });
    }

    await WalletTransactionModel.create(
      [
        {
          serviceProviderId: serviceProvider._id,
          orderdBy: {
            name: order.orderdBy?.name,
            id: order.orderdBy?.id,
            email: order.orderdBy?.email,
          },
          paymentId: order.paymentId || "N/A",
          orderId: order._id,
          amount: amountToBeDeducted,
          type: "Onboarding-Charge",
        },
      ],
      { session }
    );

    const serviceFromServiceModel = await ServiceModel.findById(
      order.subscribedToId
    ).session(session);
    const serviceFromPortfolioModel = serviceFromServiceModel
      ? null
      : await Portfolio.findById(order.subscribedToId).session(session);

    const service = serviceFromServiceModel || serviceFromPortfolioModel;

    if (!service) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Service not found!",
      });
    }

    if (serviceFromServiceModel) {
      await ServiceModel.findByIdAndUpdate(order.subscribedToId, {
        $addToSet: { subscribedBy: order.orderdBy?.id },
      }).session(session);
    } else if (serviceFromPortfolioModel) {
      await Portfolio.findByIdAndUpdate(order.subscribedToId, {
        $addToSet: { subscribedBy: order.orderdBy?.id },
      }).session(session);
    }

    /* ---------------- DELETE LEAD ---------------- */
    await LeadModel.findOneAndDelete(
      {
        userId: order.orderdBy?.id,
        serviceId: order.subscribedToId,
        providerId: order.soldBy?.id,
      },
      { session }
    );

    const channelId = service?.telegramChannelId;

    let inviteLink: { link: string } | undefined;
    if (channelId) {
      inviteLink = await getChannelInviteLink(
        channelId,
        order?._id.toString(),
        order?.subscribedToId,
        order?.orderdBy?.id!
      );

      if (!inviteLink) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Invite link not found!",
        });
      }
    } else {
      console.warn(
        "No Telegram Channel ID found for this service. Continuing without invite link..."
      );
    }

    const hasGST = !!serviceProvider.gst; // <-- New constant for GST check

    // // **Trigger Invoice Queue for Users**
    await InvoiceQueueService.add(
      order._id.toString(),
      {
        orderId: order._id,
        buyerId: order.orderdBy?.id,
        serviceName: order.serviceName,
        serviceId: order.subscribedToId,
        serviceProviderName: order.soldBy?.name,
        serviceProviderId: order.soldBy?.id,
        spaddress1: serviceProvider.address1,
        spaddress2: serviceProvider.address2,
        spcity: serviceProvider.city,
        spstate: serviceProvider.state,
        sebiRegNumber: serviceProvider.regNumber,
        buyerName: serviceTaker.name,
        // buyerAddress1: userAddress.addressLine1,
        // buyerAddress2: userAddress.addressLine2,
        // buyerCityStateZip: userAddress.cityStateZip,
        issueDate: new Date(order.createdAt).toLocaleDateString("en-IN"),
        subtotal: order.subtotal,
        gst: order.gst,
        total: order.total,
        discountAmount: order.discountAmount ?? 0,
        couponCode: (order.coupon as any)?.code ?? undefined,
        userType: "user",
        validity: order.validity.split(",")[0],
        inviteLink: inviteLink,
        hasGST,
        signedDocument: order.signedDocumentUrl,
        tnc: service.tncFileURL,
        RAnumber: serviceProvider.number,
        serviceprovideremail: serviceProvider.email,
        invitelink: inviteLink?.link,
        chatId: service.telegramChannelId,
        investorcharter: serviceProvider.investorCharter,
      },
      { removeOnComplete: true, removeOnFail: true }
    )
      .then(() => console.log("Invoice queued successfully"))
      .catch((err) => console.error("Invoice queueing failed:", err));

    // console.log(
    //   `Invoice successfully added to queue for Order ID: ${order._id}`
    // );

    // await adminNotify(
    //   `Wallet got credited with ${order.amount} from ${order.orderdBy?.name} for ${order.serviceName}`
    // );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Purchase verified successfully",
      order,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to topup",
      error: error,
    });
  }
};

export const getWalletBalance = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
    });
  }

  try {
    const { id } = req.query;

    const serviceProvider = await ServiceProviderRegModel.findById(id).select(
      "wallet"
    );

    if (!serviceProvider || !serviceProvider.wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    // Extract wallet amount and transaction IDs
    const { amount, transactions: transactionIds } = serviceProvider.wallet;

    // Fetch all transactions using their IDs
    const transactions = await WalletTransactionModel.find({
      serviceProviderId: { $in: serviceProvider._id },
    }).sort({ createdAt: -1 }).lean();

    // Enrich each wallet transaction with the plan/service name from the
    // related order so the SP's wallet history can show what was purchased.
    // NOTE: orderId on WalletTransaction is a free-form string. Top-ups,
    // withdrawals, and other non-order entries store sentinel values like
    // "RAZORPAY" or "N/A" — those won't cast to ObjectId, so filter them out.
    const isObjectIdLike = (s: any): s is string =>
      typeof s === "string" && /^[a-fA-F0-9]{24}$/.test(s);

    const orderIds = transactions
      .map((t: any) => t.orderId)
      .filter(isObjectIdLike);

    const orders = orderIds.length
      ? await OrderModel.find(
          { _id: { $in: orderIds } },
          "serviceName subscribedToId type"
        ).lean()
      : [];
    const orderMap = new Map(
      orders.map((o: any) => [o._id.toString(), o])
    );

    const enrichedTransactions = transactions.map((t: any) => {
      // Prefer the name stored on the transaction itself (set at debit time,
      // e.g. e-sign commissions where the order doesn't exist yet). Fall back
      // to the order lookup for older rows / non-commission transactions.
      const order = isObjectIdLike(t.orderId)
        ? orderMap.get(String(t.orderId))
        : null;
      return {
        ...t,
        serviceName: t.serviceName || order?.serviceName || null,
      };
    });

    // Withdrawals live in their own collection (WithdrawalModel) and never
    // create a WalletTransaction, so they're absent from the query above. Surface
    // them as debit rows alongside the wallet transactions. Only money that has
    // actually left the wallet (approved / processed) is shown — pending and
    // rejected requests are excluded. The frontend already maps type "withdraw"
    // to a "Withdrawal" / "Bank Account" debit row.
    const withdrawals = await WithdrawalModel.find({
      spId: String(serviceProvider._id),
      processedStatus: { $in: ["approved", "processed"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    const withdrawalTxns = withdrawals.map((w: any) => ({
      _id: String(w._id),
      amount: w.amount,
      type: "withdraw",
      serviceName: "Withdrawal",
      createdAt: w.createdAt,
      orderdBy: { name: w.name, email: w.email },
    }));

    const mergedTransactions = [...enrichedTransactions, ...withdrawalTxns].sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.status(200).json({
      success: true,
      message: "wallet balance fetched",
      data: {
        amount,
        transactions: mergedTransactions,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

// GET /api/payment/subscriber-presence — AUTHENTICATED. Returns the online
// status of the calling service provider's subscribers. We deliberately add a
// dedicated, token-gated endpoint (SP resolved from req.user) instead of piping
// presence/PII through the unauthenticated /transactions route.
export const getServiceProviderSubscriberPresence = async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const actor = req.user as { _id?: string; id?: string };
  const spId = String(actor._id || actor.id || "");
  if (!spId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    // Subscribers via orders sold by this SP (same verified-only filter as
    // getTransactions) ...
    const orderUserIds = await OrderModel.find({
      "soldBy.id": spId,
      $nor: [
        { paymentMethod: "Manual", paymentStatus: { $in: ["pending", "rejected"] } },
      ],
    }).distinct("orderdBy.id");

    // ... plus users registered to this SP's events.
    const spEvents = await EventModel.find({ "authorData.id": spId })
      .select("_id")
      .lean();
    let eventUserIds: any[] = [];
    if (spEvents.length) {
      eventUserIds = await EventRegistrationModel.find({
        eventId: { $in: spEvents.map((e: any) => e._id) },
      }).distinct("userId");
    }

    const ids = [
      ...new Set(
        [...orderUserIds, ...eventUserIds].map((x) => String(x)).filter(Boolean)
      ),
    ];

    const users = await UserModel.find({ _id: { $in: ids } })
      .select("_id lastSeenAt")
      .lean();

    const now = Date.now();
    const presence: Record<
      string,
      { isOnline: boolean; lastSeenAt: Date | null }
    > = {};
    users.forEach((u: any) => {
      presence[String(u._id)] = {
        isOnline: isOnline(u.lastSeenAt, now),
        lastSeenAt: u.lastSeenAt || null,
      };
    });

    return res.status(200).json({ success: true, presence });
  } catch (error) {
    console.error("Failed to fetch subscriber presence:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch subscriber presence" });
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
    });
  }

  try {
    const { id } = req.query;

    const spInfo = await ServiceProviderRegModel.findById(id);

    if (!spInfo) {
      return res.status(404).json({
        success: false,
        message: "Service Provider not found",
      });
    }

    // Pool the whole profile family so a Non-Individual master AND its
    // sub-profiles all see the firm's subscribers. Orders/events are sold/owned
    // under the master (or whichever RA created them), so a sub-profile querying
    // only its own id would see nothing. Resolves:
    //   master    -> master + all sub-profiles
    //   admin sub  -> the master's whole family (master + siblings)
    //   user sub   -> just itself
    //   individual -> just itself
    const authorIds = await getProfileFamilyIds(String(id));

    // The Subscribers section must only show VERIFIED subscribers. Manual
    // orders that are still pending verification (or were rejected) belong in
    // the Leads section instead. Exclude only those — legacy orders without a
    // paymentStatus, gateway/wallet/Manual-Converted orders stay visible.
    const transactions = await OrderModel.find({
      "soldBy.id": { $in: authorIds },
      $nor: [{ paymentMethod: "Manual", paymentStatus: { $in: ["pending", "rejected"] } }],
    }).sort({
      createdAt: -1,
    });

    const enhancedTransactions = await Promise.all(
      transactions.map(async (txn) => {
        const buyer = await UserModel.findById(txn?.orderdBy?.id);
        const obj = txn.toObject();
        return {
          ...obj,
          number: buyer?.number || null, // fallback if buyer not found
          // Customer profile fields surfaced for the subscribers table.
          city: buyer?.city || null,
          state: buyer?.state || null,
          gender: buyer?.gender || null,
          aadhaarLast4: buyer?.aadhaarLast4 || null,
          // Preserve the real type (service / portfolio / package) — fallback to "service"
          type: obj.type || "service",
        };
      })
    );

    const withdrawals = await WithdrawalModel.find({ spId: id }).sort({
      createdAt: -1,
    });

    // Fetch event registrations for ALL events (paid + free) owned by the firm
    const spEvents = await EventModel.find({
      "authorData.id": { $in: authorIds },
    }).select("_id title price schedule eventType eventCostType").lean();

    console.log("[Transactions] SP has", spEvents.length, "events");

    const eventIds = spEvents.map((e) => e._id);
    const eventMap = new Map(spEvents.map((e) => [e._id.toString(), e]));

    let eventRegistrations: any[] = [];
    if (eventIds.length > 0) {
      const registrations = await EventRegistrationModel.find({
        eventId: { $in: eventIds },
      }).sort({ createdAt: -1 }).lean();

      console.log("[Transactions] Found", registrations.length, "event registrations");

      eventRegistrations = await Promise.all(
        registrations.map(async (reg) => {
          const buyer = await UserModel.findById(reg.userId);
          const event = eventMap.get(reg.eventId.toString());
          const isPaid = event?.eventCostType === "Paid" && (event?.price || 0) > 0;
          return {
            _id: reg._id,
            type: "event",
            serviceName: event?.title || "Event",
            orderdBy: {
              id: reg.userId,
              name: reg.userName || buyer?.name || "",
              email: reg.userEmail || buyer?.email || "",
            },
            soldBy: { id, name: spInfo.RegName },
            number: buyer?.number || null,
            amount: event?.price || 0,
            total: event?.price || 0,
            subtotal: event?.price || 0,
            gst: 0,
            paymentMethod: isPaid ? "Razorpay" : "Free",
            eventMode: reg.eventMode,
            eventSchedule: event?.schedule,
            eventCostType: event?.eventCostType,
            createdAt: reg.createdAt,
            updatedAt: reg.updatedAt,
            verifiedByRa: true,
          };
        })
      );
    }

    // Also include legacy registrations that were saved directly on EventModel.registeredUsers
    try {
      const eventsWithLegacyUsers = await EventModel.find({
        "authorData.id": { $in: authorIds },
        "registeredUsers.0": { $exists: true },
      }).select("_id title price schedule registeredUsers eventCostType").lean();

      for (const evt of eventsWithLegacyUsers) {
        for (const ru of evt.registeredUsers || []) {
          if (!ru.userId) continue;
          const buyer = await UserModel.findById(ru.userId);
          const isPaid = evt.eventCostType === "Paid" && (evt.price || 0) > 0;
          eventRegistrations.push({
            _id: `${evt._id}_${ru.userId}`,
            type: "event",
            serviceName: evt.title || "Event",
            orderdBy: {
              id: ru.userId,
              name: buyer?.name || "",
              email: buyer?.email || "",
            },
            soldBy: { id, name: spInfo.RegName },
            number: buyer?.number || null,
            amount: evt.price || 0,
            total: evt.price || 0,
            subtotal: evt.price || 0,
            gst: 0,
            paymentMethod: isPaid ? "Razorpay" : "Free",
            eventMode: ru.eventMode,
            eventSchedule: evt.schedule,
            eventCostType: evt.eventCostType,
            createdAt: ru.registrationDate || new Date(),
            updatedAt: ru.registrationDate || new Date(),
            verifiedByRa: true,
          });
        }
      }
    } catch (err) {
      console.error("[Transactions] Legacy event users fetch failed:", err);
    }

    const mergedArray = [...enhancedTransactions, ...withdrawals, ...eventRegistrations];

    const data = mergedArray.sort(
      (a, b) =>
        (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime()
    );

    return res.status(200).json({
      success: true,
      message: "Transactions fetched",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: error,
    });
  }
};

export const AddPaymentDetails = async (req: Request, res: Response) => {
  if (!req.body.data) {
    return res.status(500).json({
      success: false,
      message: "Failed to add",
    });
  }

  try {
    const parsedBody = JSON.parse(req.body.data);

    const { beneficiaryName, accNumber, ifsc, upi, id, bankName } = parsedBody;

    console.log(beneficiaryName, accNumber, ifsc, upi, id, bankName);
    const file = req.file as Express.MulterS3.File;

    if (!file || !file.location) {
      return res.status(400).json({
        success: false,
        message: "UPI QR Code is required",
      });
    }

    const newDetails = new PaymentDetailsModel({
      beneficiaryName,
      accNumber,
      ifsc,
      upi,
      bankName,
      qrCode: file && file.location ? file.location : "",
    });

    await newDetails.save();

    await ServiceProviderRegModel.findByIdAndUpdate(id, {
      $set: { paymentDetails: newDetails._id.toString() },
    });

    return res.status(200).json({
      success: true,
      message: "Added details",
      newDetails,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Failed to add",
      error: error,
    });
  }
};

export const updatePaymentDetails = async (req: Request, res: Response) => {
  if (!req.body.data) {
    return res.status(500).json({
      success: false,
      message: "Failed to updathue",
    });
  }

  try {
    const parsedBody = JSON.parse(req.body.data);

    const { beneficiaryName, accNumber, ifsc, upi, _id, bankName } = parsedBody;

    const file = req.file as Express.MulterS3.File;

    const existingPayment = await PaymentDetailsModel.findById(_id);

    const qrCode =
      file && file.location ? file.location : existingPayment?.qrCode;

    await PaymentDetailsModel.findByIdAndUpdate(_id, {
      $set: {
        beneficiaryName,
        accNumber,
        ifsc,
        upi,
        bankName,
        qrCode,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Details updated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update",
      error: error,
    });
  }
};

export const getPaymentDetails = async (req: Request, res: Response) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Missing service provider ID",
    });
  }

  try {
    const sp = await ServiceProviderRegModel.findById(id)
      .select("paymentDetails services razorpayKey cashfreeKey")
      .populate("paymentDetails");

    if (!sp) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    if (sp.services?.paymentGateway) {
      const integration = (sp.services as any)?.integration || "razorpay";

      if (integration === "cashfree" && sp.cashfreeKey) {
        const cashfree = await CashfreeKeyModel.findById(sp.cashfreeKey).lean();
        if (cashfree) {
          return res.status(200).json({
            success: true,
            message: "Cashfree keys fetched",
            data: {
              type: "gateway",
              gateway: "cashfree",
              cashfree,
              recurringPaymentEnabled: !!sp.services?.recurringPayment,
            },
          });
        }
      }

      if (sp.razorpayKey) {
        const razorpay = await RazorpayKeyModel.findById(sp.razorpayKey).lean();
        if (razorpay) {
          return res.status(200).json({
            success: true,
            message: "Razorpay keys fetched",
            data: {
              type: "gateway",
              gateway: "razorpay",
              razorpay,
              recurringPaymentEnabled: !!sp.services?.recurringPayment,
            },
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Manual payment details fetched",
      data: {
        type: "manual",
        paymentDetails: sp.paymentDetails || null,
      },
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment details",
      error,
    });
  }
};

export const AddRazorpayKeys = async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(400).json({
      success: false,
      message: "Missing data",
    });
  }

  try {
    const { keyId, keySecret, webhookSecret, id, name, email } = req.body;

    if (!keyId || !keySecret || !id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Save Razorpay keys in separate collection
    const razorpayKeys = new RazorpayKeyModel({
      keyId,
      keySecret, // Consider encrypting this before saving
      webhookSecret,
      userId: id,
      name,
      email,
    });

    await razorpayKeys.save();

    await ServiceProviderRegModel.findByIdAndUpdate(id, {
      $set: {
        razorpayKey: razorpayKeys._id.toString(),
        "services.integration": "razorpay",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Razorpay keys added successfully",
    });
  } catch (error) {
    console.error("AddRazorpayKeys error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

export const updateRazorpayKeys = async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(500).json({
      success: false,
      message: "Failed to update",
    });
  }

  try {
    const { _id, keyId, keySecret, webhookSecret } = req.body;

    if (!_id || !keyId || !keySecret) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // webhookSecret is optional (schema: required:false, not collected by the
    // integration form). Only write it when explicitly provided so an update
    // that omits it never clobbers a previously-saved value.
    const update: Record<string, any> = {
      keyId,
      keySecret, // Consider encrypting before storing
    };
    if (webhookSecret) update.webhookSecret = webhookSecret;

    const updateResult = await RazorpayKeyModel.findByIdAndUpdate(_id, {
      $set: update,
    });
    if (!updateResult) {
      return res.status(404).json({
        success: false,
        message: "Razorpay keys not found",
      });
    }

    await ServiceProviderRegModel.findByIdAndUpdate(updateResult.userId, {
      $set: {
        "services.integration": "razorpay",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Razorpay keys updated successfully",
    });
  } catch (error) {
    console.error("updateRazorpayKeys error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update",
      error,
    });
  }
};

export const getRazorpayKeys = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
    });
  }

  try {
    const { id } = req.query;

    const data = await ServiceProviderRegModel.findById(id)
      .select("razorpayKey")
      .populate("razorpayKey");

    return res.status(200).json({
      success: true,
      message: "Razorpay keys fetched",
      data: data?.razorpayKey,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error,
    });
  }
};

/* ======================== Cashfree Key CRUD ======================== */

export const AddCashfreeKeys = async (req: Request, res: Response) => {
  try {
    const { appId, secretKey, id, name, email } = req.body;

    if (!appId || !secretKey || !id) {
      return res.status(400).json({
        success: false,
        message: "appId, secretKey, and service provider id are required",
      });
    }

    const cashfreeKeys = new CashfreeKeyModel({
      appId,
      secretKey,
      userId: id,
      name,
      email,
    });

    await cashfreeKeys.save();

    await ServiceProviderRegModel.findByIdAndUpdate(id, {
      $set: {
        cashfreeKey: cashfreeKeys._id.toString(),
        "services.integration": "cashfree",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Cashfree keys added successfully",
    });
  } catch (error) {
    console.error("AddCashfreeKeys error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

export const updateCashfreeKeys = async (req: Request, res: Response) => {
  try {
    const { _id, appId, secretKey } = req.body;

    if (!_id || !appId || !secretKey) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const updateResult = await CashfreeKeyModel.findByIdAndUpdate(_id, {
      $set: { appId, secretKey },
    });

    if (!updateResult) {
      return res.status(404).json({
        success: false,
        message: "Cashfree keys not found",
      });
    }

    await ServiceProviderRegModel.findByIdAndUpdate(updateResult.userId, {
      $set: {
        "services.integration": "cashfree",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Cashfree keys updated successfully",
    });
  } catch (error) {
    console.error("updateCashfreeKeys error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update",
      error,
    });
  }
};

export const getCashfreeKeys = async (req: Request, res: Response) => {
  if (!req.query.id) {
    return res.status(400).json({
      success: false,
      message: "Service provider id is required",
    });
  }

  try {
    const { id } = req.query;

    const data = await ServiceProviderRegModel.findById(id)
      .select("cashfreeKey")
      .populate("cashfreeKey");

    return res.status(200).json({
      success: true,
      message: "Cashfree keys fetched",
      data: data?.cashfreeKey,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error,
    });
  }
};

export const withdrawAmount = async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch",
    });
  }

  const expectedKeys = ["name", "amount", "email", "spId"];

  try {
    const parsedBody = req.body;
    const allElementsPresent = expectedKeys.every((key) =>
      parsedBody.hasOwnProperty(key)
    );
    if (!allElementsPresent)
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });

    const { name, email, amount, spId } = req.body;

    const newWithdrawal = new WithdrawalModel({
      email,
      name,
      amount,
      spId,
    });

    newWithdrawal.save();

    return res.status(200).json({
      success: true,
      message: "withdraw request created",
      // data: transactions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create request",
      error: error,
    });
  }
};

export const claimPromoOneDiscount = async (req: Request, res: Response) => {
  if (!req.body) {
    return res
      .status(400)
      .json({ success: false, message: "No Data provided" });
  }

  try {
    const parsedBody = req.body;

    const {
      id,
      name,
      email,
      type,
      title,
      disclaimer,
      validity,
      price,
      coupon,
      serviceType,
      authorImage,
      AUM,
      NoOfClients,
      inceptionDate,
      Fundmanager,
      returnsByTime,
      AsOn,
      isFreeTrial,
      freeTrailDays,
      duration,
      Documents,
      validTill,
      description,
      coupenCode,
    } = parsedBody;

    const track = await PromoCodeTrackerModel.find({
      availedBy: id,
    });

    // if (track.length > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Already claimed promo code",
    //   });
    // }

    const codes: Record<string, string> = {
      PROMOS1: "silver",
      PROMOG1: "gold",
      PROMOP1: "platinum",
    };
    const scheduledDateTimeinceptionDate = new Date(inceptionDate);
    const scheduledDateTimeAsOn = new Date(AsOn);

    const newService = new ServiceModel({
      authorData: {
        id,
        name,
        email,
        type,
        authorImage,
      },
      title,
      validity,
      disclaimer,
      price,
      description,
      coupon,
      serviceType,
      AUM,
      NoOfClients,
      inceptionDate: scheduledDateTimeinceptionDate,
      Fundmanager,
      returnsByTime,
      isFreeTrial,
      freeTrailDays,
      AsOn: scheduledDateTimeAsOn,
      tradeboxPlanType: codes[coupenCode],
      tradeboxPlanDuration: Number(duration),
      Documents,
    });

    await newService.save();

    await ServiceProviderRegModel.findByIdAndUpdate(
      id,
      { $inc: { "stats.contentStats.services": 1 } },
      { new: true }
    );

    // New service has a title — clear the dashboard name cache so the
    // next dashboard tick resolves it instead of waiting for the TTL.
    invalidateServiceNameCache();

    const newPlanPurchase = new TradeboxPlansModel({
      serviceId: newService._id,
      orderdBy: {
        name: newService.authorData?.name,
        id: newService.authorData?.id,
        email: newService.authorData?.email,
      },
      paymentId: coupenCode,
      orderId: coupenCode,
      amount: 0,
      paymentMethod: coupenCode,
      planName: codes[coupenCode],
      duration: 30,
      validity: new Date(validTill).toLocaleString("en-IN"),
    });

    await newPlanPurchase.save();

    const service = await ServiceModel.findByIdAndUpdate(newService._id, {
      $set: {
        tradeboxPlanPaid: true,
        activated: true,
        tradeboxPlanType: codes[coupenCode],
        tradeboxPlanDuration: 30,
      },
    });

    const newPromoTracker = new PromoCodeTrackerModel({
      availedBy: newService.authorData?.id,
      promo: coupenCode,
      serviceId: newService._id,
    });

    await newPromoTracker.save();

    await adminNotify(
      `${newPlanPurchase.orderdBy?.name} has claimed ${coupenCode} for ${service?.title}`
    );

    await adminNotify(
      `${newPlanPurchase.orderdBy?.name} has uploaded a new plan with ${service?.title}`
    );

    return res.status(200).json({
      success: true,
      message: "Promo code claimed and service created successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "There was an error claiming please try again",
      error: error,
    });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  if (!req.body || !req.body.data) {
    console.error("No Data");
    return res
      .status(400)
      .json({ success: false, message: "No Data provided" });
  }
  try {
    // ✅ Parse the JSON data from FormData
    let parsedData;
    try {
      console.log("unparsed data: ", req.body.data);
      parsedData = JSON.parse(req.body.data); // req.body.data contains the stringified JSON
      console.log("parsed data: ", parsedData);
      console.log("number 1");
    } catch (error) {
      console.error("Error parsing JSON data:", error);
      return res
        .status(400)
        .json({ success: false, message: "Invalid JSON data" });
    }

    const {
      subscribedToId,
      serviceName,
      orderByName,
      orderById,
      orderByEmail,
      soldByName,
      soldById,
      subtotal,
      gst,
      total,
      validity,
      signedDocumentUrl,
      aadhaarUrl,
      panUrl,
      panNumber,
      dob,
      paymentId,
      isRenewal,
      previousOrderId,
      type,
      paymentMode,
      coupon,
      discountAmount,
      kycDocuments,
      kycCompleted,
    } = parsedData;

    const paymentProofUrl = req.file as Express.MulterS3.File;

    if (!parsedData) {
      console.log("Parsed data not received");
    }

    const esignReject = await assertMatchedEsignOrReject(
      String(orderById),
      String(subscribedToId)
    );
    if (esignReject) {
      return res.status(esignReject.status).json(esignReject.body);
    }

    let extendedEndDate = null;
    // If this is a renewal, mark the previous order as renewed
    if (isRenewal && previousOrderId) {
      try {
        const previousOrder = await OrderModel.findById(previousOrderId);

        if (previousOrder) {
          const currentEndDate = previousOrder.endDate || new Date();
          const newEndDate = new Date(currentEndDate);

          if (type === "portfolio") {
            // Legacy portfolios stored validity as "12 months"/"2 years"; new
            // portfolios store a number of days (matching services/packages).
            const validityMatch = validity?.match(/(\d+)\s*(month|year)/i);
            if (validityMatch) {
              const num = parseInt(validityMatch[1]) || 0;
              const unit = validityMatch[2].toLowerCase();
              if (unit.startsWith("year")) {
                newEndDate.setFullYear(newEndDate.getFullYear() + num);
              } else {
                newEndDate.setMonth(newEndDate.getMonth() + num);
              }
            } else {
              const validityDays = Number(validity) || 0;
              newEndDate.setDate(newEndDate.getDate() + validityDays);
            }
          } else {
            // For services/packages, validity is in days
            const validityDays = parseInt(validity) || 0;
            newEndDate.setDate(newEndDate.getDate() + validityDays);
          }

          extendedEndDate = newEndDate;

          // Update previous order status
          previousOrder.isRenewed = true;
          previousOrder.renewedAt = new Date();
          previousOrder.previousOrderId = previousOrderId; // Will be set after new order is created
          previousOrder.endDate = newEndDate;

          await previousOrder.save();
          console.log(`Previous order ${previousOrderId} marked as renewed`);
        } else {
          console.log(`Previous order ${previousOrderId} not found`);
        }
      } catch (error) {
        console.error("Error updating previous order:", error);
        // Don't fail the entire operation if previous order update fails
      }
    }

    const user = await UserModel.findById(orderById);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Calculate end date for new order
    let orderEndDate = new Date();
    if (type === "portfolio") {
      // Legacy portfolios stored validity as "12 months"/"2 years"; new
      // portfolios store a number of days (matching services/packages).
      const validityMatch = validity?.match(/(\d+)\s*(month|year)/i);
      if (validityMatch) {
        const num = parseInt(validityMatch[1]) || 0;
        const unit = validityMatch[2].toLowerCase();
        if (unit.startsWith("year")) {
          orderEndDate.setFullYear(orderEndDate.getFullYear() + num);
        } else {
          orderEndDate.setMonth(orderEndDate.getMonth() + num);
        }
      } else {
        const validityDays = Number(validity) || 0;
        orderEndDate.setDate(orderEndDate.getDate() + validityDays);
      }
    } else {
      // For services/packages, validity is in days
      const validityDays = parseInt(validity) || 0;
      orderEndDate.setDate(orderEndDate.getDate() + validityDays);
    }

    const order = new OrderModel({
      subscribedToId,
      serviceName,
      orderdBy: {
        name: orderByName,
        id: orderById,
        email: orderByEmail,
      },
      soldBy: {
        name: soldByName,
        id: soldById,
      },
      paymentId: paymentId,
      orderId: "",
      subtotal: subtotal,
      gst: gst,
      total: total,
      paymentMethod: paymentMode === "gateway" ? "Gateway" : "Manual",
      validity: validity,
      invoiceLink: "",
      isExpired: false,
      remainder: 0,
      type: type || "service",
      signedDocumentUrl: signedDocumentUrl,
      verifiedByRa: false,
      kycDetails: {
        aadhaarUrl: aadhaarUrl,
        panUrl: panUrl,
        panNumber: user.pannumber,
        dob: user.dob,
      },
      kycDocuments: kycDocuments || null,
      kycCompleted: kycCompleted || false,
      coupon: coupon || null,
      discountAmount: discountAmount || 0,
      isRenewal: isRenewal || false,
      previousOrderId: isRenewal ? previousOrderId : null,
      // Set start and end dates
      startDate: new Date(),
      endDate: isRenewal && extendedEndDate ? extendedEndDate : orderEndDate,
      paymentProof: paymentProofUrl?.location || null,
    });

    // Save to database
    await order.save();

    if (!order) {
      console.log("order note created");
    }

    await UserModel.findByIdAndUpdate(orderById, {
      $addToSet: {
        "ServicesAndOrders.services": subscribedToId,
        "ServicesAndOrders.orders": order._id,
      },
    });

    // Get service provider's website if exists
    const serviceProvider = await ServiceProviderRegModel.findById(soldById);
    const website = serviceProvider?.website || "/";

    // Notifications - include renewal info in message
    const notificationMessage = isRenewal
      ? `${order.orderdBy?.name} has renewed your plan ${order.serviceName} for ${validity} days`
      : `${order.orderdBy?.name} has purchased your plan ${order.serviceName}`;

    // Notifications
    await new notificationModel({
      message: notificationMessage,
      sendTo: [{ id: order.soldBy?.id, name: order.soldBy?.name }],
      sentBy: { id: "admin", name: "admin" },
      type: "service",
    }).save();

    await ServiceProviderRegModel.findByIdAndUpdate(orderById, {
      $set: { subscription: serviceName },
      $addToSet: { "ServicesAndOrders.orders": order._id },
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: order,
      website: website,
    });
  } catch (error) {
    console.log("Error creating order:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const createAndVerifyOrder = async (req: Request, res: Response) => {
  if (!req.body || !req.body.data) {
    return res.status(400).json({
      success: false,
      message: "No Data provided",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    /* ---------------- PARSE DATA ---------------- */

    let parsedData;
    try {
      parsedData = JSON.parse(req.body.data);
    } catch {
      return res
        .status(400)
        .json({ success: false, message: "Invalid JSON data" });
    }

    const {
      subscribedToId,
      serviceName,
      orderByName,
      orderById,
      orderByEmail,
      soldByName,
      soldById,
      subtotal,
      gst,
      total,
      validity,
      signedDocumentUrl,
      aadhaarUrl,
      panUrl,
      paymentId,
      isRenewal,
      previousOrderId,
      coupon,
      discountAmount,
      type,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      razorpaySubscriptionId,
      razorpayPlanId,
      autoRenew,
      paymentMode,
      cashfreePaymentId,
      cashfreeOrderId,
      cashfreeReferenceOrderId,
    } = parsedData;

    if (!subscribedToId || !orderById || !soldById || total === undefined || total === null) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const esignReject = await assertMatchedEsignOrReject(
      String(orderById),
      String(subscribedToId)
    );
    if (esignReject) {
      await session.abortTransaction();
      session.endSession();
      return res.status(esignReject.status).json(esignReject.body);
    }

    // The SP wallet was already debited at e-sign completion. Pull the
    // committed amount + transaction id so we can patch the orderId/paymentId
    // onto the WalletTransaction record once the order exists.
    const esignSession = await EsignSessionModel.findOne({
      userId: String(orderById),
      serviceId: String(subscribedToId),
      status: "COMPLETED",
    }).sort({ updatedAt: -1 });

    if (!esignSession?.chargeDebited) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message:
          "Onboarding charge was not committed at e-sign. Please retry the e-sign step.",
      });
    }

    const amountToBeDeducted = esignSession.chargeAmount ?? 0;
    const esignWalletTransactionId = esignSession.walletTransactionId;

    // A fully-discounted / free order has total 0, which payment gateways
    // reject. We skip the gateway entirely and create an ACTIVE order — but
    // only after an authoritative server-side check that the order is GENUINELY
    // free (a real ₹0 item, or a coupon that zeroes the real price). The
    // client's `total` is never trusted as proof of a free order.
    const isFreeOrder = Number(total) === 0;
    if (isFreeOrder) {
      const elig = await assertFreeOrderEligible({
        subscribedToId,
        type,
        validity,
        coupon,
      });
      if (!elig.ok) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(elig.status)
          .json({ success: false, message: elig.message });
      }
    }

    // Free orders take the active (non-manual) path so the full post-order flow
    // (subscribe, telegram, email, invoice) runs — they're simply not gateway.
    const isManualPayment = !isFreeOrder && paymentMode !== "gateway";
    const isCashfreePayment = !!(cashfreePaymentId || cashfreeOrderId);

    /* ---------------- FETCH SP KEYS (needed for verification + mandate) ---------------- */
    let spRazorpayKeyId = "";
    let spRazorpaySecret = process.env.RAZORPAY_SECRET!;

    const spForVerification =
      await ServiceProviderRegModel.findById(soldById).select("razorpayKey cashfreeKey services");

    if (spForVerification?.razorpayKey) {
      const razorpayKeyEntry = await RazorpayKeyModel.findById(
        spForVerification.razorpayKey
      );
      if (razorpayKeyEntry?.keyId) {
        spRazorpayKeyId = razorpayKeyEntry.keyId;
      }
      if (razorpayKeyEntry?.keySecret) {
        spRazorpaySecret = razorpayKeyEntry.keySecret;
      }
    }

    /* ---------------- PAYMENT VERIFICATION (Gateway Only) ---------------- */

    if (paymentMode === "gateway") {
      if (isCashfreePayment) {
        /* ---------- CASHFREE VERIFICATION ---------- */
        const cfOrderIdToVerify = cashfreeReferenceOrderId || cashfreeOrderId;
        if (!cfOrderIdToVerify) {
          return res.status(400).json({
            success: false,
            message: "Missing Cashfree order ID for verification",
          });
        }

        if (spForVerification?.cashfreeKey) {
          const cashfreeKeyEntry = await CashfreeKeyModel.findById(spForVerification.cashfreeKey);
          if (cashfreeKeyEntry?.appId && cashfreeKeyEntry?.secretKey) {
            const cfStatus = await getCashfreeOrderStatus(
              cashfreeKeyEntry.appId,
              cashfreeKeyEntry.secretKey,
              cfOrderIdToVerify
            );
            if (cfStatus.order_status !== "PAID") {
              return res.status(400).json({
                success: false,
                message: `Cashfree payment not completed. Status: ${cfStatus.order_status}`,
              });
            }
          }
        }
      } else {
        /* ---------- RAZORPAY VERIFICATION ---------- */
        const crypto = require("crypto");

        if (autoRenew && razorpaySubscriptionId) {
          if (!razorpayPaymentId || !razorpaySubscriptionId || !razorpaySignature) {
            return res.status(400).json({
              success: false,
              message: "Missing Razorpay subscription fields",
            });
          }

          const expected = crypto
            .createHmac("sha256", spRazorpaySecret)
            .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
            .digest("hex");

          if (expected !== razorpaySignature) {
            logOnboardingIssue({
              step: "payment_verification",
              severity: "critical",
              reason: "Razorpay subscription signature verification failed",
              errorCode: "subscription_signature_mismatch",
              customerId: orderById,
              customerName: orderByName,
              customerEmail: orderByEmail,
              spId: soldById,
              spName: soldByName,
              planId: subscribedToId,
              planTitle: serviceName,
              planPrice: total,
              paymentId: razorpayPaymentId,
              orderId: razorpaySubscriptionId,
              userAgent: req.headers["user-agent"],
              ipAddress: req.ip,
              metadata: { autoRenew, isRenewal, razorpayPlanId, route: req.path },
            });
            return res.status(400).json({
              success: false,
              message: "Subscription payment verification failed",
            });
          }
        } else {
          if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
            logOnboardingIssue({
              step: "payment_verification",
              severity: "critical",
              reason: "Missing Razorpay fields after payment",
              errorCode: "missing_razorpay_fields",
              customerId: orderById,
              customerName: orderByName,
              customerEmail: orderByEmail,
              spId: soldById,
              spName: soldByName,
              planId: subscribedToId,
              planTitle: serviceName,
              planPrice: total,
              paymentId: razorpayPaymentId,
              orderId: razorpayOrderId,
              userAgent: req.headers["user-agent"],
              ipAddress: req.ip,
              metadata: { hasPaymentId: !!razorpayPaymentId, hasOrderId: !!razorpayOrderId, hasSignature: !!razorpaySignature, route: req.path },
            });
            return res.status(400).json({
              success: false,
              message: "Missing Razorpay fields",
            });
          }

          const expected = crypto
            .createHmac("sha256", spRazorpaySecret)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");

          if (expected !== razorpaySignature) {
            logOnboardingIssue({
              step: "payment_verification",
              severity: "critical",
              reason: "Razorpay payment signature verification failed",
              errorCode: "signature_mismatch",
              customerId: orderById,
              customerName: orderByName,
              customerEmail: orderByEmail,
              spId: soldById,
              spName: soldByName,
              planId: subscribedToId,
              planTitle: serviceName,
              planPrice: total,
              paymentId: razorpayPaymentId,
              orderId: razorpayOrderId,
              userAgent: req.headers["user-agent"],
              ipAddress: req.ip,
              metadata: { route: req.path },
            });
            return res.status(400).json({
              success: false,
              message: "Payment verification failed",
            });
          }
        }
      }
    }

    /* ---------------- IDEMPOTENCY GUARD (Gateway Only) ----------------
       A single successful Razorpay/Cashfree response can be replayed by
       the browser (refresh during redirect, double-click, network retry).
       Without this guard, the same payment would create duplicate Orders,
       double-deduct the provider's wallet, and produce duplicate rows in
       the subscribers dashboard. Look up by the gateway payment id stored
       on the Order and short-circuit if we've already processed it. */
    if (paymentMode === "gateway") {
      const gatewayRef = razorpayPaymentId || cashfreePaymentId;
      if (gatewayRef) {
        const existing = await OrderModel.findOne({ paymentId: gatewayRef });
        if (existing) {
          await session.abortTransaction();
          return res.status(200).json({
            success: true,
            message: "Payment already processed",
            order: existing,
            idempotent: true,
          });
        }
      }
    }

    /* ---------------- FETCH USER & PROVIDER ---------------- */

    const [user, serviceProvider] = await Promise.all([
      UserModel.findById(orderById),
      ServiceProviderRegModel.findById(soldById),
    ]);

    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    /* ---------------- RENEWAL LOGIC (Gateway Only) ---------------- */

    let extendedEndDate: Date | null = null;

    // Only process renewal logic for gateway payments
    // For manual payments, this will be done when payment is verified
    if (!isManualPayment && isRenewal && previousOrderId) {
      const previousOrder =
        await OrderModel.findById(previousOrderId).session(session);

      if (previousOrder) {
        const today = new Date();
        const previousEndDate = new Date(previousOrder.endDate || today);

        // Early renewal: extend from previous end date (preserves remaining days)
        // Expired renewal: start fresh from today
        const baseDate = previousEndDate > today ? previousEndDate : today;
        const newEnd = new Date(baseDate);

        if (type === "portfolio") {
          // Legacy portfolios stored validity as "12 months"/"2 years"; new
          // portfolios store a number of days (matching services/packages).
          const validityMatch = validity?.match(/(\d+)\s*(month|year)/i);
          if (validityMatch) {
            const num = parseInt(validityMatch[1]) || 0;
            const unit = validityMatch[2].toLowerCase();
            if (unit.startsWith("year")) {
              newEnd.setFullYear(newEnd.getFullYear() + num);
            } else {
              newEnd.setMonth(newEnd.getMonth() + num);
            }
          } else {
            const validityDays = Number(validity) || 0;
            newEnd.setDate(newEnd.getDate() + validityDays);
          }
        } else {
          // For services/packages, validity is in days
          const validityDays = Number(validity) || 0;
          newEnd.setDate(newEnd.getDate() + validityDays);
        }

        previousOrder.isRenewed = true;
        previousOrder.renewedAt = new Date();
        previousOrder.endDate = newEnd;

        await previousOrder.save({ session });
        extendedEndDate = newEnd;
      }
    }

    // Wallet deduction now happens at e-sign completion (see
    // esignController.handleCallback + helpers/walletDebit). amountToBeDeducted
    // here is the value the SP was already charged, used downstream for the
    // WalletTransaction patch only.

    /* ---------------- FETCH PURCHASED ITEM ---------------- */

    let purchasedItem: any;

    if (type === "service") {
      purchasedItem = await ServiceModel.findById(subscribedToId);
    } else if (type === "portfolio") {
      purchasedItem = await Portfolio.findById(subscribedToId);
    } else if (type === "package") {
      purchasedItem =
        await PackageModel.findById(subscribedToId).populate(
          "includedServices",
        );
    }

    if (!purchasedItem) {
      return res
        .status(400)
        .json({ success: false, message: `${type} not found` });
    }

    /* ---------------- TELEGRAM INVITE LINKS ----------------
       Generated AFTER session.commitTransaction() — see the post-commit
       block below. They're declared here so the OrderModel.save() can persist
       the (initially null/empty) fields atomically with the rest of the order.
       Telegram is an external dependency: rate limits, network blips, or bot
       perm changes used to fail the entire transaction, leaving paid customers
       without an order. Now the order always lands; the invite link is patched
       in on a best-effort basis. */
    let telegramInviteLink: string | null = null;
    let telegramInviteLinks: { serviceName: string; link: string }[] = [];

    /* ---------------- CREATE ORDER ---------------- */

    // For manual payments, don't set start/end dates yet - will be set on verification
    const orderEndDate = new Date();
    if (!isManualPayment) {
      if (type === "portfolio") {
        // Legacy portfolios stored validity as "12 months"/"2 years"; new
        // portfolios store a number of days (matching services/packages).
        const validityMatch = validity?.match(/(\d+)\s*(month|year)/i);
        if (validityMatch) {
          const num = parseInt(validityMatch[1]) || 0;
          const unit = validityMatch[2].toLowerCase();
          if (unit.startsWith("year")) {
            orderEndDate.setFullYear(orderEndDate.getFullYear() + num);
          } else {
            orderEndDate.setMonth(orderEndDate.getMonth() + num);
          }
        } else {
          const validityDays = Number(validity) || 0;
          orderEndDate.setDate(orderEndDate.getDate() + validityDays);
        }
      } else {
        // For services/packages, validity is in days
        const validityDays = Number(validity) || 0;
        orderEndDate.setDate(orderEndDate.getDate() + validityDays);
      }
    }

    // Get payment proof URL from multer-s3 upload
    const paymentProofFile = req.file as Express.MulterS3.File | undefined;
    const paymentProofUrl = paymentProofFile?.location || null;

    const order = await new OrderModel({
      subscribedToId,
      serviceName,
      orderdBy: { name: orderByName, id: orderById, email: orderByEmail },
      soldBy: { name: soldByName, id: soldById },
      // Always store the gateway payment id for gateway orders so the
      // idempotency guard above has a reliable lookup key. Free orders have no
      // gateway id, so synthesize a unique one (the paymentId index is sparse-
      // unique — a shared literal would collide across free orders).
      paymentId: isFreeOrder
        ? `free_${new mongoose.Types.ObjectId().toString()}`
        : paymentMode === "gateway"
          ? razorpayPaymentId || cashfreePaymentId || paymentId
          : paymentId,
      subtotal,
      gst,
      total,
      paymentMethod: isFreeOrder
        ? "Free"
        : paymentMode === "gateway"
          ? "Gateway"
          : "Manual",
      validity,
      type,
      signedDocumentUrl,
      // For manual payments: not verified yet; for gateway: verified
      verifiedByRa: !isManualPayment,
      paymentStatus: isManualPayment ? "pending" : "verified",
      kycDetails: { 
        aadhaarUrl,
        panUrl,
        panNumber: user?.pannumber,
        dob: user?.dob,
      },
      isRenewal,
      previousOrderId,
      // For manual payments, don't set dates yet - will be set on verification
      startDate: isManualPayment ? null : new Date(),
      endDate: isManualPayment ? null : (isRenewal && extendedEndDate ? extendedEndDate : orderEndDate),
      coupon,
      discountAmount,
      paymentProof: paymentProofUrl,

      telegramInviteLink,
      telegramInviteLinks,
    }).save({ session });

    /* ---------- COUPON USAGE INCREMENT ----------
       Atomic, transactional bump so the global `usageLimit` is actually
       enforced. Returns an error if a concurrent redemption already hit the
       cap between validation and now. */
    if (coupon?.id) {
      const redeem = await redeemCoupon(String(coupon.id), session);
      if (!redeem.ok) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ success: false, message: redeem.message });
      }
    }

    /* ---------- SAVE MANDATE (Auto-Renew Only) ---------- */
    if (autoRenew && razorpaySubscriptionId && !isManualPayment) {
      try {
        const rzpSub = await fetchRazorpaySubscription(
          razorpaySubscriptionId,
          spRazorpayKeyId || undefined,
          spRazorpaySecret || undefined
        );
        await new MandateModel({
          orderId: order._id,
          userId: orderById,
          serviceProviderId: soldById,
          subscribedToId,
          razorpayPlanId: razorpayPlanId || rzpSub.plan_id,
          razorpaySubscriptionId,
          planDetails: {
            serviceName,
            type,
            subtotal,
            gst,
            total,
            validity,
            subscribedToId,
            soldByName,
            soldById,
            soldByEmail: serviceProvider.email,
            orderByName,
            orderById,
            orderByEmail,
          },
          status: "active",
          totalCount: rzpSub.total_count || 120,
          paidCount: 1, // First payment just happened
          nextChargeAt: rzpSub.charge_at
            ? new Date(rzpSub.charge_at * 1000)
            : null,
        }).save({ session });

        console.log(
          `[MANDATE] Created mandate for order ${order._id}, subscription: ${razorpaySubscriptionId}`
        );
      } catch (mandateErr) {
        console.error(
          "[MANDATE] Failed to create mandate (order still valid):",
          mandateErr
        );
      }
    }

    // Add order to user's orders array (for both manual and gateway)
    await UserModel.findByIdAndUpdate(
      orderById,
      {
        $addToSet: {
          "ServicesAndOrders.orders": order._id,
        },
      },
      { session }
    );

    /* ============================================================
       MANUAL PAYMENT: Only create order and notify SP
       Skip invoice, email, telegram, subscription (wallet was already
       debited at e-sign)
    ============================================================ */
    if (isManualPayment) {
      // Link the e-sign-time wallet transaction to the new order.
      if (esignWalletTransactionId) {
        await WalletTransactionModel.updateOne(
          { _id: esignWalletTransactionId },
          { orderId: order._id.toString(), paymentId: paymentId || "manual" },
          { session },
        );
      }

      // Send notification to service provider about pending verification
      await new notificationModel({
        message: `New order from ${orderByName} for ${serviceName} - Payment proof uploaded, pending verification`,
        sendTo: [{ id: soldById, name: soldByName }],
        sentBy: { id: "system", name: "System" },
        type: "payment-verification",
      }).save({ session });

      await session.commitTransaction();

      return res.status(201).json({
        success: true,
        message: "Order created successfully. Pending payment verification by service provider.",
        order,
        paymentStatus: "pending",
      });
    }

    /* ============================================================
       GATEWAY PAYMENT: Full flow - invoice, email, etc. Wallet was
       debited at e-sign; just link the existing transaction to the order.
    ============================================================ */

    /* ---------------- WALLET TRANSACTION PATCH ---------------- */

    if (esignWalletTransactionId) {
      await WalletTransactionModel.updateOne(
        { _id: esignWalletTransactionId },
        {
          orderId: order._id.toString(),
          paymentId:
            paymentId || razorpayPaymentId || cashfreePaymentId || "manual",
        },
        { session },
      );
    }


    /* ---------------- DELETE LEAD ---------------- */

    await LeadModel.findOneAndDelete(
      {
        userId: orderById,
        serviceId: subscribedToId,
        providerId: soldById,
      },
      { session },
    );

    /* ---------------- SUBSCRIBE USER ---------------- */

    // Add service to user's subscribed services
    await UserModel.findByIdAndUpdate(
      orderById,
      {
        $addToSet: {
          "ServicesAndOrders.services": subscribedToId,
        },
      },
      { session }
    );

    if (type === "service") {
      await ServiceModel.findByIdAndUpdate(
        subscribedToId,
        { $addToSet: { subscribedBy: orderById } },
        { session }
      );
    }

    if (type === "portfolio") {
      await Portfolio.findByIdAndUpdate(
        subscribedToId,
        { $addToSet: { subscribedBy: orderById } },
        { session }
      );
    }

    if (type === "package") {
      const includedServiceIds = (purchasedItem.includedServices || [])
        .map((svc: any) => svc?._id)
        .filter(Boolean);

      await Promise.all(
        includedServiceIds.map((svcId: any) =>
          ServiceModel.findByIdAndUpdate(
            svcId,
            { $addToSet: { subscribedBy: orderById } },
            { session }
          ),
        ),
      );

      // Package buyers should see each included plan in their "Subscribed
      // Services" sidebar. The earlier ServicesAndOrders.services update only
      // pushed the package id (which doesn't match any ServiceModel doc) —
      // also push every included service id so the aggregation finds them.
      if (includedServiceIds.length > 0) {
        await UserModel.findByIdAndUpdate(
          orderById,
          { $addToSet: { "ServicesAndOrders.services": { $each: includedServiceIds } } },
          { session }
        );
      }
    }

    await session.commitTransaction();

    /* ---------------- TELEGRAM INVITE LINKS (post-commit, best-effort) ----------------
       External Telegram I/O lives here so a Bot-API failure (rate-limit,
       network blip, missing perms) cannot abort the order transaction and
       leave a paid customer without a record. The order is already saved;
       on failure we log to the OnboardingIssue inbox for admin recovery.
       The invite link is also surfaced on the user's dashboard once patched. */
    if (!isManualPayment) {
      try {
        const userTelegramId = user?.telegramUserId;

        if (type === "service" && purchasedItem.telegramChannelId) {
          let skipInviteLink = false;
          if (isRenewal && userTelegramId) {
            skipInviteLink = await isUserInChannel(
              purchasedItem.telegramChannelId,
              userTelegramId,
            );
          }
          if (!skipInviteLink) {
            const invite = await getChannelInviteLink(
              purchasedItem.telegramChannelId,
              "pending",
              subscribedToId,
              orderById,
            );
            if (invite?.link) telegramInviteLink = invite.link;
          }
        }

        if (type === "package") {
          for (const svc of purchasedItem.includedServices || []) {
            if (!svc.telegramChannelId) continue;

            let skipInviteLink = false;
            if (isRenewal && userTelegramId) {
              skipInviteLink = await isUserInChannel(
                svc.telegramChannelId,
                userTelegramId,
              );
            }
            if (!skipInviteLink) {
              const invite = await getChannelInviteLink(
                svc.telegramChannelId,
                "pending",
                subscribedToId,
                orderById,
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

        if (telegramInviteLink || telegramInviteLinks.length) {
          await OrderModel.findByIdAndUpdate(order._id, {
            telegramInviteLink,
            telegramInviteLinks,
          });
        }
      } catch (telegramErr: any) {
        console.error(
          "[Telegram] invite link generation failed after order save:",
          {
            orderId: order._id?.toString(),
            paymentId: order.paymentId,
            subscribedToId,
            type,
            error: telegramErr?.message ?? String(telegramErr),
          },
        );
        logOnboardingIssue({
          step: "telegram_invite",
          severity: "warning",
          reason: "Failed to generate Telegram invite link after order creation",
          errorMessage: telegramErr?.message ?? String(telegramErr),
          customerId: orderById,
          customerName: orderByName,
          customerEmail: orderByEmail,
          spId: soldById,
          spName: soldByName,
          planId: subscribedToId,
          planTitle: serviceName,
          planPrice: total,
          paymentId: order.paymentId ?? undefined,
          orderId: order._id?.toString(),
          metadata: { type, isRenewal },
        });
      }
    }

    /* ---------------- EMAIL ---------------- */

    let telegramHtml = "";

    // Portfolio purchases get a button to the public factsheet page so the buyer
    // can review the portfolio's holdings straight from the confirmation email.
    // Empty for non-portfolio orders (services / packages / courses).
    const factsheetHtml =
      type === "portfolio"
        ? `<div style="text-align:center;margin:20px 0;"><a href="${process.env.NEXTAUTH_URL || process.env.FRONTEND_URL || ""}/view/factsheet/${subscribedToId}" style="display:inline-block;background-color:#01DDAA;color:#fff;padding:12px 24px;border-radius:5px;text-decoration:none;font-weight:bold;font-size:16px;">View Portfolio Factsheet</a></div>`
        : "";

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
        </div>`,
        )
        .join("");
    }

    // Bell notification to the SP — was missing on this gateway path, so the
    // SP only saw the wallet-debit notification ("commission charged") and
    // never a clear "X bought your plan" alert.
    try {
      await sendNotification({
        recipientIds: [String(soldById)].filter(Boolean) as string[],
        recipientRole: "provider",
        message: isRenewal
          ? `${user?.name || "A customer"} renewed your plan ${serviceName}`
          : `${user?.name || "A customer"} purchased your plan ${serviceName}`,
        type: "service",
        category: "admin",
        sentBy: {
          id: String(orderById) || "system",
          name: user?.name || "Customer",
        },
        postLink: "/dashboard/serviceprovider/leads",
        ctaLabel: "View Lead",
      });
    } catch (err) {
      console.error("SP purchase notification failed:", err);
    }

    try {
      await mailQueue.add(
        user?.email!,
        {
          mailOptions: {
            from: process.env.EMAIL,
            to: user?.email,
            cc: serviceProvider.email,
            subject: isRenewal
              ? `Renewal Confirmation for ${serviceName}`
              : `Confirmation for ${serviceName} purchase`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 0 20px;"> <!-- Greeting and Purchase Information --> <p style="font-size: 16px; color: #333; margin-bottom: 20px;">We thank you for choosing the services, kindly download your e-sign documents and join the channel for all the updates by clicking the link given below.</p> <h2 style="text-align: left;">${isRenewal ? 'Renewal Confirmation' : 'Order Confirmation'}</h2> ${autoRenew ? '<div style="background:#f0fdf4;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #22c55e;"><p style="margin:0;color:#166534;font-weight:bold;">✅ Auto-Renewal Active</p><p style="margin:5px 0 0;color:#166534;">Your plan will auto-renew via UPI Auto-Pay. You can cancel anytime from your account settings.</p></div>' : ''} <div style="padding: 10px 0;"> <h4 style="padding-bottom: 5px;">Purchased by:</h4> <h5>Name: <span>${user?.name}</span></h5> <h5>Email: <span>${user?.email}</span></h5> <h5>Purchase Date: <span>${new Date(order.createdAt).toLocaleDateString("en-IN")}\ </span></h5> </div> <table style="width: 100%; border-collapse: collapse; margin-top: 20px;"> <tr> <td style="padding: 10px; border: 1px solid #ddd;">Plan Name</td> <td style="padding: 10px; border: 1px solid #ddd;">${serviceName}</td> </tr> <tr> <td style="padding: 10px; border: 1px solid #ddd;">Price</td> <td style="padding: 10px; border: 1px solid #ddd;">₹${subtotal}</td> </tr> <tr> <td style="padding: 10px; border: 1px solid #ddd;">GST (18%)</td> <td style="padding: 10px; border: 1px solid #ddd;">₹${gst}</td> </tr> <tr> <td style="padding: 10px; border: 1px solid #ddd;">Total Amount</td> <td style="padding: 10px; border: 1px solid #ddd;">₹${total}</td> </tr> </table> ${telegramHtml} <div style="text-align: center; margin: 20px 0;"> <p style="margin-bottom: 15px; font-size: 16px;">Your signed document:</p> <a href="${order.signedDocumentUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 16px;"> View Signed Document </a> </div> <div style="text-align: center; margin: 20px 0;"></div> ${factsheetHtml} <p style="margin-top: 20px; font-size: 14px; color: #555;"> Note: All prices are inclusive of GST. Please save this email for future reference. </p> </div>
            `,
          },
        },
        { removeOnComplete: false, removeOnFail: false },
      );
    } catch (err) {
      console.error("Mail queue failed for order:", order._id, err);
    }

    try {
      await InvoiceQueueService.add(
        "invoice-queue-service",
        {
          orderId: order._id.toString(),
          userType: "user",

          serviceId: subscribedToId,
          serviceName: serviceName,

          serviceProviderName: soldByName,
          serviceProviderId: soldById,
          serviceprovideremail: serviceProvider.email,
          serviceProviderAddress: [serviceProvider.city, serviceProvider.state].filter(Boolean).join(", "),
          serviceProviderRegistrationNumber: serviceProvider.regNumber,
          serviceProviderWebsite: serviceProvider.website,
          serviceProviderGST: serviceProvider.gst ? serviceProvider.gst : "",
          serviceProviderHSN: serviceProvider.hsnCode ? serviceProvider.hsnCode : "",
          serviceProviderPhone: serviceProvider.number,
          serviceProviderState: serviceProvider.state,

          buyerId: user?.id,
          buyerName: user?.name,
          buyerNumber: user?.number,
          buyerEmail: user?.email,
          buyerPan: user?.pannumber ? user.pannumber : "",

          subtotal,
          gst,
          total,
          discountAmount: discountAmount ?? 0,
          couponCode: coupon?.code ?? undefined,
          // Append "days" only for bare-numeric validity (services/packages and
          // new day-based portfolios); legacy "N months/years" passes through.
          validity: /^\d+$/.test(String(validity).trim())
            ? `${validity} days`
            : validity,

          issueDate: order.createdAt,
          serviceStartDate: order.startDate,
          serviceEndDate: order.endDate,
        },
        {
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
    } catch (err) {
      // 🚨 IMPORTANT: Invoice failure should NOT break order flow
      console.error("Invoice queue failed for order:", order._id, err);
    }

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error: any) {
    await session.abortTransaction();

    // Best-effort re-parse so the logger has identifying context even when
    // the in-try destructure of req.body.data is what threw.
    let ctx: Record<string, any> = {};
    try {
      ctx = JSON.parse(req.body?.data ?? "{}");
    } catch {
      /* ignore — keep ctx empty */
    }

    const paymentId =
      ctx.razorpayPaymentId || ctx.cashfreePaymentId || ctx.paymentId;
    const errorCode = error?.code ? String(error.code) : error?.name;
    const errorMessage = error?.message ?? String(error);

    console.error("[createAndVerifyOrder] order creation failed", {
      paymentId,
      subscribedToId: ctx.subscribedToId,
      orderById: ctx.orderById,
      type: ctx.type,
      errorCode,
      errorMessage,
      stack: error?.stack,
    });

    // Paid-but-no-order is the worst class of failure on this surface — flag
    // it as critical so admins get paged and can issue a refund / manual
    // order before the customer escalates.
    logOnboardingIssue({
      step: "order_creation",
      severity: paymentId ? "critical" : "warning",
      reason: paymentId
        ? `Payment captured (${paymentId}) but order creation failed`
        : "Order creation failed",
      errorCode,
      errorMessage,
      customerId: ctx.orderById,
      customerName: ctx.orderByName,
      customerEmail: ctx.orderByEmail,
      spId: ctx.soldById,
      spName: ctx.soldByName,
      planId: ctx.subscribedToId,
      planTitle: ctx.serviceName,
      planPrice: ctx.total,
      paymentId,
      stack: error?.stack,
      metadata: {
        handler: "createAndVerifyOrder",
        paymentMode: ctx.paymentMode,
        type: ctx.type,
      },
    });

    return res.status(500).json({
      success: false,
      code: "ORDER_CREATE_FAILED",
      message: paymentId
        ? `Payment captured (${paymentId}) but order creation failed. Please contact support.`
        : "Order creation failed. Please try again or contact support.",
      paymentId,
    });
  } finally {
    session.endSession();
  }
}

/**
 * Marketplace Purchase - separate handler with broker commission logic.
 * Same core flow as createAndVerifyOrder but additionally:
 * 1. Looks up the marketplace & broker from the marketplaceSlug
 * 2. Deducts broker commission (hardcoded 10% of subtotal + GST) from RA wallet
 * 3. Credits broker wallet
 * 4. Tags the order with marketplaceId and brokerCommission
 */
export const createAndVerifyOrderMarketplace = async (req: Request, res: Response) => {
  if (!req.body || !req.body.data) {
    return res.status(400).json({
      success: false,
      message: "No Data provided",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let parsedData;
    try {
      parsedData = JSON.parse(req.body.data);
    } catch {
      return res
        .status(400)
        .json({ success: false, message: "Invalid JSON data" });
    }

    const {
      subscribedToId,
      serviceName,
      orderByName,
      orderById,
      orderByEmail,
      soldByName,
      soldById,
      subtotal,
      gst,
      total,
      validity,
      signedDocumentUrl,
      aadhaarUrl,
      panUrl,
      paymentId,
      isRenewal,
      previousOrderId,
      coupon,
      discountAmount,
      type,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      razorpaySubscriptionId,
      razorpayPlanId,
      autoRenew,
      paymentMode,
      cashfreePaymentId,
      cashfreeOrderId,
      cashfreeReferenceOrderId,
      marketplaceSlug,
    } = parsedData;

    if (!subscribedToId || !orderById || !soldById || total === undefined || total === null) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!marketplaceSlug) {
      return res.status(400).json({
        success: false,
        message: "marketplaceSlug is required for marketplace purchases",
      });
    }

    const esignReject = await assertMatchedEsignOrReject(
      String(orderById),
      String(subscribedToId)
    );
    if (esignReject) {
      await session.abortTransaction();
      session.endSession();
      return res.status(esignReject.status).json(esignReject.body);
    }

    /* ---------------- MARKETPLACE & BROKER LOOKUP ---------------- */

    const marketplace = await MarketplaceModel.findOne({ slug: marketplaceSlug });
    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: "Marketplace not found",
      });
    }

    const broker = await ServiceProviderRegModel.findById(marketplace.createdByBrokerId);
    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker associated with marketplace not found",
      });
    }

    // Fully-discounted / free marketplace order (total 0) — verify server-side
    // that it's genuinely free before skipping the gateway. Same guard as
    // createAndVerifyOrder; client `total` is not trusted as proof.
    const isFreeOrder = Number(total) === 0;
    if (isFreeOrder) {
      const elig = await assertFreeOrderEligible({
        subscribedToId,
        type,
        validity,
        coupon,
      });
      if (!elig.ok) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(elig.status)
          .json({ success: false, message: elig.message });
      }
    }

    const isManualPayment = !isFreeOrder && paymentMode !== "gateway";
    const isCashfreePayment = !!(cashfreePaymentId || cashfreeOrderId);

    /* ---------------- FETCH SP KEYS ---------------- */
    let spRazorpayKeyId = "";
    let spRazorpaySecret = process.env.RAZORPAY_SECRET!;

    const spForVerification =
      await ServiceProviderRegModel.findById(soldById).select("razorpayKey cashfreeKey services");

    if (spForVerification?.razorpayKey) {
      const razorpayKeyEntry = await RazorpayKeyModel.findById(
        spForVerification.razorpayKey
      );
      if (razorpayKeyEntry?.keyId) {
        spRazorpayKeyId = razorpayKeyEntry.keyId;
      }
      if (razorpayKeyEntry?.keySecret) {
        spRazorpaySecret = razorpayKeyEntry.keySecret;
      }
    }

    /* ---------------- PAYMENT VERIFICATION (Gateway Only) ---------------- */

    if (paymentMode === "gateway") {
      if (isCashfreePayment) {
        const cfOrderIdToVerify = cashfreeReferenceOrderId || cashfreeOrderId;
        if (!cfOrderIdToVerify) {
          return res.status(400).json({
            success: false,
            message: "Missing Cashfree order ID for verification",
          });
        }

        if (spForVerification?.cashfreeKey) {
          const cashfreeKeyEntry = await CashfreeKeyModel.findById(spForVerification.cashfreeKey);
          if (cashfreeKeyEntry?.appId && cashfreeKeyEntry?.secretKey) {
            const cfStatus = await getCashfreeOrderStatus(
              cashfreeKeyEntry.appId,
              cashfreeKeyEntry.secretKey,
              cfOrderIdToVerify
            );
            if (cfStatus.order_status !== "PAID") {
              return res.status(400).json({
                success: false,
                message: `Cashfree payment not completed. Status: ${cfStatus.order_status}`,
              });
            }
          }
        }
      } else {
        const crypto = require("crypto");

        if (autoRenew && razorpaySubscriptionId) {
          if (!razorpayPaymentId || !razorpaySubscriptionId || !razorpaySignature) {
            return res.status(400).json({
              success: false,
              message: "Missing Razorpay subscription fields",
            });
          }

          const expected = crypto
            .createHmac("sha256", spRazorpaySecret)
            .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
            .digest("hex");

          if (expected !== razorpaySignature) {
            logOnboardingIssue({
              step: "payment_verification",
              severity: "critical",
              reason: "Razorpay subscription signature verification failed",
              errorCode: "subscription_signature_mismatch",
              customerId: orderById,
              customerName: orderByName,
              customerEmail: orderByEmail,
              spId: soldById,
              spName: soldByName,
              planId: subscribedToId,
              planTitle: serviceName,
              planPrice: total,
              paymentId: razorpayPaymentId,
              orderId: razorpaySubscriptionId,
              userAgent: req.headers["user-agent"],
              ipAddress: req.ip,
              metadata: { autoRenew, isRenewal, razorpayPlanId, route: req.path },
            });
            return res.status(400).json({
              success: false,
              message: "Subscription payment verification failed",
            });
          }
        } else {
          if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
            logOnboardingIssue({
              step: "payment_verification",
              severity: "critical",
              reason: "Missing Razorpay fields after payment",
              errorCode: "missing_razorpay_fields",
              customerId: orderById,
              customerName: orderByName,
              customerEmail: orderByEmail,
              spId: soldById,
              spName: soldByName,
              planId: subscribedToId,
              planTitle: serviceName,
              planPrice: total,
              paymentId: razorpayPaymentId,
              orderId: razorpayOrderId,
              userAgent: req.headers["user-agent"],
              ipAddress: req.ip,
              metadata: { hasPaymentId: !!razorpayPaymentId, hasOrderId: !!razorpayOrderId, hasSignature: !!razorpaySignature, route: req.path },
            });
            return res.status(400).json({
              success: false,
              message: "Missing Razorpay fields",
            });
          }

          const expected = crypto
            .createHmac("sha256", spRazorpaySecret)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");

          if (expected !== razorpaySignature) {
            logOnboardingIssue({
              step: "payment_verification",
              severity: "critical",
              reason: "Razorpay payment signature verification failed",
              errorCode: "signature_mismatch",
              customerId: orderById,
              customerName: orderByName,
              customerEmail: orderByEmail,
              spId: soldById,
              spName: soldByName,
              planId: subscribedToId,
              planTitle: serviceName,
              planPrice: total,
              paymentId: razorpayPaymentId,
              orderId: razorpayOrderId,
              userAgent: req.headers["user-agent"],
              ipAddress: req.ip,
              metadata: { route: req.path },
            });
            return res.status(400).json({
              success: false,
              message: "Payment verification failed",
            });
          }
        }
      }
    }

    /* ---------------- IDEMPOTENCY GUARD (Gateway Only) ----------------
       A single successful Razorpay/Cashfree response can be replayed by
       the browser (refresh during redirect, double-click, network retry).
       Without this guard, the same payment would create duplicate Orders,
       double-deduct the provider's wallet, and produce duplicate rows in
       the subscribers dashboard. Look up by the gateway payment id stored
       on the Order and short-circuit if we've already processed it. */
    if (paymentMode === "gateway") {
      const gatewayRef = razorpayPaymentId || cashfreePaymentId;
      if (gatewayRef) {
        const existing = await OrderModel.findOne({ paymentId: gatewayRef });
        if (existing) {
          await session.abortTransaction();
          return res.status(200).json({
            success: true,
            message: "Payment already processed",
            order: existing,
            idempotent: true,
          });
        }
      }
    }

    /* ---------------- FETCH USER & PROVIDER ---------------- */

    const [user, serviceProvider] = await Promise.all([
      UserModel.findById(orderById),
      ServiceProviderRegModel.findById(soldById),
    ]);

    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    /* ---------------- RENEWAL LOGIC (Gateway Only) ---------------- */

    let extendedEndDate: Date | null = null;

    if (!isManualPayment && isRenewal && previousOrderId) {
      const previousOrder =
        await OrderModel.findById(previousOrderId).session(session);

      if (previousOrder) {
        const today = new Date();
        const previousEndDate = new Date(previousOrder.endDate || today);
        const baseDate = previousEndDate > today ? previousEndDate : today;
        const newEnd = new Date(baseDate);

        if (type === "portfolio") {
          // Legacy portfolios stored validity as "12 months"/"2 years"; new
          // portfolios store a number of days (matching services/packages).
          const validityMatch = validity?.match(/(\d+)\s*(month|year)/i);
          if (validityMatch) {
            const num = parseInt(validityMatch[1]) || 0;
            const unit = validityMatch[2].toLowerCase();
            if (unit.startsWith("year")) {
              newEnd.setFullYear(newEnd.getFullYear() + num);
            } else {
              newEnd.setMonth(newEnd.getMonth() + num);
            }
          } else {
            const validityDays = Number(validity) || 0;
            newEnd.setDate(newEnd.getDate() + validityDays);
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
    }

    /* ---------------- WALLET DEDUCTION + BROKER COMMISSION (Gateway Only) ---------------- */

    let amountToBeDeducted = 0;
    const BROKER_COMMISSION_RATE = 10; // hardcoded 10%
    let brokerCommissionAmount = 0;

    if (!isManualPayment) {
      const subscription = await TradeboxPlansModel.findById(
        serviceProvider.subscriptionDetails?.currentSubscription,
      );

      if (!subscription) {
        return res.status(400).json({
          success: false,
          message: "Service provider has no active subscription",
        });
      }

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

      // Broker commission: 10% of subtotal + 18% GST
      brokerCommissionAmount = (subtotal * BROKER_COMMISSION_RATE / 100) * 1.18;

      const totalDeduction = amountToBeDeducted + brokerCommissionAmount;

      if (serviceProvider.wallet.amount < totalDeduction) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance (including broker commission)",
        });
      }

      // Deduct from RA wallet: onboarding + broker commission
      serviceProvider.wallet.amount -= totalDeduction;
      await serviceProvider.save({ session });
      await notifyWalletChange({
        spId: String(serviceProvider._id),
        spName: serviceProvider.RegName,
        amount: totalDeduction,
        direction: "debit",
        reason: isRenewal
          ? `renewal commission (incl. broker commission) for ${serviceName}`
          : `onboarding commission (incl. broker commission) for ${serviceName}`,
        newBalance: serviceProvider.wallet.amount,
        session,
      });

      // Credit broker wallet
      broker.wallet.amount += brokerCommissionAmount;
      await broker.save({ session });
      await notifyWalletChange({
        spId: String(broker._id),
        spName: (broker as any).RegName,
        amount: brokerCommissionAmount,
        direction: "credit",
        reason: `broker commission from ${serviceProvider.RegName} for ${serviceName}`,
        newBalance: broker.wallet.amount,
        session,
      });
    }

    /* ---------------- FETCH PURCHASED ITEM ---------------- */

    let purchasedItem: any;

    if (type === "service") {
      purchasedItem = await ServiceModel.findById(subscribedToId);
    } else if (type === "portfolio") {
      purchasedItem = await Portfolio.findById(subscribedToId);
    } else if (type === "package") {
      purchasedItem =
        await PackageModel.findById(subscribedToId).populate(
          "includedServices",
        );
    }

    if (!purchasedItem) {
      return res
        .status(400)
        .json({ success: false, message: `${type} not found` });
    }

    /* ---------------- TELEGRAM INVITE LINKS ----------------
       Generated AFTER session.commitTransaction() — see the post-commit
       block below. Same rationale as createAndVerifyOrder: keep external
       Telegram I/O out of the order transaction so a Bot-API failure cannot
       leave a paid customer without an order record. */
    let telegramInviteLink: string | null = null;
    let telegramInviteLinks: { serviceName: string; link: string }[] = [];

    /* ---------------- CREATE ORDER ---------------- */

    const orderEndDate = new Date();
    if (!isManualPayment) {
      if (type === "portfolio") {
        // Legacy portfolios stored validity as "12 months"/"2 years"; new
        // portfolios store a number of days (matching services/packages).
        const validityMatch = validity?.match(/(\d+)\s*(month|year)/i);
        if (validityMatch) {
          const num = parseInt(validityMatch[1]) || 0;
          const unit = validityMatch[2].toLowerCase();
          if (unit.startsWith("year")) {
            orderEndDate.setFullYear(orderEndDate.getFullYear() + num);
          } else {
            orderEndDate.setMonth(orderEndDate.getMonth() + num);
          }
        } else {
          const validityDays = Number(validity) || 0;
          orderEndDate.setDate(orderEndDate.getDate() + validityDays);
        }
      } else {
        const validityDays = Number(validity) || 0;
        orderEndDate.setDate(orderEndDate.getDate() + validityDays);
      }
    }

    const paymentProofFile = req.file as Express.MulterS3.File | undefined;
    const paymentProofUrl = paymentProofFile?.location || null;

    const order = await new OrderModel({
      subscribedToId,
      serviceName,
      orderdBy: { name: orderByName, id: orderById, email: orderByEmail },
      soldBy: { name: soldByName, id: soldById },
      // Always store the gateway payment id for gateway orders so the
      // idempotency guard above has a reliable lookup key. Free orders have no
      // gateway id, so synthesize a unique one (the paymentId index is sparse-
      // unique — a shared literal would collide across free orders).
      paymentId: isFreeOrder
        ? `free_${new mongoose.Types.ObjectId().toString()}`
        : paymentMode === "gateway"
          ? razorpayPaymentId || cashfreePaymentId || paymentId
          : paymentId,
      subtotal,
      gst,
      total,
      paymentMethod: isFreeOrder
        ? "Free"
        : paymentMode === "gateway"
          ? "Gateway"
          : "Manual",
      validity,
      type,
      signedDocumentUrl,
      verifiedByRa: !isManualPayment,
      paymentStatus: isManualPayment ? "pending" : "verified",
      kycDetails: {
        aadhaarUrl,
        panUrl,
        panNumber: user?.pannumber,
        dob: user?.dob,
      },
      isRenewal,
      previousOrderId,
      startDate: isManualPayment ? null : new Date(),
      endDate: isManualPayment ? null : (isRenewal && extendedEndDate ? extendedEndDate : orderEndDate),
      coupon,
      discountAmount,
      paymentProof: paymentProofUrl,
      telegramInviteLink,
      telegramInviteLinks,
      marketplaceId: marketplace._id.toString(),
      brokerCommission: brokerCommissionAmount,
    }).save({ session });

    /* ---------- COUPON USAGE INCREMENT ----------
       Same atomic redemption guard as createAndVerifyOrder — see comment
       there for rationale. */
    if (coupon?.id) {
      const redeem = await redeemCoupon(String(coupon.id), session);
      if (!redeem.ok) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ success: false, message: redeem.message });
      }
    }

    /* ---------- SAVE MANDATE (Auto-Renew Only) ---------- */
    if (autoRenew && razorpaySubscriptionId && !isManualPayment) {
      try {
        const rzpSub = await fetchRazorpaySubscription(
          razorpaySubscriptionId,
          spRazorpayKeyId || undefined,
          spRazorpaySecret || undefined
        );
        await new MandateModel({
          orderId: order._id,
          userId: orderById,
          serviceProviderId: soldById,
          subscribedToId,
          razorpayPlanId: razorpayPlanId || rzpSub.plan_id,
          razorpaySubscriptionId,
          planDetails: {
            serviceName,
            type,
            subtotal,
            gst,
            total,
            validity,
            subscribedToId,
            soldByName,
            soldById,
            soldByEmail: serviceProvider.email,
            orderByName,
            orderById,
            orderByEmail,
          },
          status: "active",
          totalCount: rzpSub.total_count || 120,
          paidCount: 1,
          nextChargeAt: rzpSub.charge_at
            ? new Date(rzpSub.charge_at * 1000)
            : null,
        }).save({ session });
      } catch (mandateErr) {
        console.error(
          "[MANDATE] Failed to create mandate (order still valid):",
          mandateErr
        );
      }
    }

    await UserModel.findByIdAndUpdate(
      orderById,
      {
        $addToSet: {
          "ServicesAndOrders.orders": order._id,
        },
      },
      { session }
    );

    /* ============================================================
       MANUAL PAYMENT: Only create order and notify SP
    ============================================================ */
    if (isManualPayment) {
      await new notificationModel({
        message: `New marketplace order from ${orderByName} for ${serviceName} - Payment proof uploaded, pending verification`,
        sendTo: [{ id: soldById, name: soldByName }],
        sentBy: { id: "system", name: "System" },
        type: "payment-verification",
      }).save({ session });

      await session.commitTransaction();

      return res.status(201).json({
        success: true,
        message: "Marketplace order created successfully. Pending payment verification.",
        order,
        paymentStatus: "pending",
      });
    }

    /* ============================================================
       GATEWAY PAYMENT: Full flow
    ============================================================ */

    /* ---------------- WALLET TRANSACTIONS ---------------- */

    // RA onboarding/renewal charge transaction
    await WalletTransactionModel.create(
      [
        {
          serviceProviderId: soldById,
          orderdBy: {
            name: orderByName,
            id: orderById,
            email: orderByEmail,
          },
          paymentId: paymentId || razorpayPaymentId || cashfreePaymentId || "manual",
          orderId: order._id.toString(),
          amount: amountToBeDeducted,
          type: isRenewal ? "Renewal-Charge" : "Onboarding-Charge",
        },
      ],
      { session },
    );

    // Broker commission credit transaction
    if (brokerCommissionAmount > 0) {
      await WalletTransactionModel.create(
        [
          {
            serviceProviderId: broker._id.toString(),
            orderdBy: {
              name: orderByName,
              id: orderById,
              email: orderByEmail,
            },
            paymentId: paymentId || razorpayPaymentId || cashfreePaymentId || "manual",
            orderId: order._id.toString(),
            amount: brokerCommissionAmount,
            type: "marketplace-broker-commission",
            remarks: `Broker commission from marketplace ${marketplace.name} for service ${serviceName}`,
          },
        ],
        { session },
      );

      // RA broker commission deduction transaction (so RA can see why their wallet decreased)
      await WalletTransactionModel.create(
        [
          {
            serviceProviderId: soldById,
            orderdBy: {
              name: orderByName,
              id: orderById,
              email: orderByEmail,
            },
            paymentId: paymentId || razorpayPaymentId || cashfreePaymentId || "manual",
            orderId: order._id.toString(),
            amount: brokerCommissionAmount,
            type: "deduction",
            remarks: `Broker commission deducted for marketplace ${marketplace.name}`,
          },
        ],
        { session },
      );
    }

    /* ---------------- DELETE LEAD ---------------- */

    await LeadModel.findOneAndDelete(
      {
        userId: orderById,
        serviceId: subscribedToId,
        providerId: soldById,
      },
      { session },
    );

    /* ---------------- SUBSCRIBE USER ---------------- */

    await UserModel.findByIdAndUpdate(
      orderById,
      {
        $addToSet: {
          "ServicesAndOrders.services": subscribedToId,
        },
      },
      { session }
    );

    if (type === "service") {
      await ServiceModel.findByIdAndUpdate(
        subscribedToId,
        { $addToSet: { subscribedBy: orderById } },
        { session }
      );
    }

    if (type === "portfolio") {
      await Portfolio.findByIdAndUpdate(
        subscribedToId,
        { $addToSet: { subscribedBy: orderById } },
        { session }
      );
    }

    if (type === "package") {
      const includedServiceIds = (purchasedItem.includedServices || [])
        .map((svc: any) => svc?._id)
        .filter(Boolean);

      await Promise.all(
        includedServiceIds.map((svcId: any) =>
          ServiceModel.findByIdAndUpdate(
            svcId,
            { $addToSet: { subscribedBy: orderById } },
            { session }
          ),
        ),
      );

      // Package buyers should see each included plan in their "Subscribed
      // Services" sidebar. The earlier ServicesAndOrders.services update only
      // pushed the package id (which doesn't match any ServiceModel doc) —
      // also push every included service id so the aggregation finds them.
      if (includedServiceIds.length > 0) {
        await UserModel.findByIdAndUpdate(
          orderById,
          { $addToSet: { "ServicesAndOrders.services": { $each: includedServiceIds } } },
          { session }
        );
      }
    }

    await session.commitTransaction();

    /* ---------------- TELEGRAM INVITE LINKS (post-commit, best-effort) ----------------
       External Telegram I/O lives here so a Bot-API failure (rate-limit,
       network blip, missing perms) cannot abort the order transaction and
       leave a paid customer without a record. The order is already saved;
       on failure we log to the OnboardingIssue inbox for admin recovery.
       The invite link is also surfaced on the user's dashboard once patched. */
    if (!isManualPayment) {
      try {
        const userTelegramId = user?.telegramUserId;

        if (type === "service" && purchasedItem.telegramChannelId) {
          let skipInviteLink = false;
          if (isRenewal && userTelegramId) {
            skipInviteLink = await isUserInChannel(
              purchasedItem.telegramChannelId,
              userTelegramId,
            );
          }
          if (!skipInviteLink) {
            const invite = await getChannelInviteLink(
              purchasedItem.telegramChannelId,
              "pending",
              subscribedToId,
              orderById,
            );
            if (invite?.link) telegramInviteLink = invite.link;
          }
        }

        if (type === "package") {
          for (const svc of purchasedItem.includedServices || []) {
            if (!svc.telegramChannelId) continue;

            let skipInviteLink = false;
            if (isRenewal && userTelegramId) {
              skipInviteLink = await isUserInChannel(
                svc.telegramChannelId,
                userTelegramId,
              );
            }
            if (!skipInviteLink) {
              const invite = await getChannelInviteLink(
                svc.telegramChannelId,
                "pending",
                subscribedToId,
                orderById,
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

        if (telegramInviteLink || telegramInviteLinks.length) {
          await OrderModel.findByIdAndUpdate(order._id, {
            telegramInviteLink,
            telegramInviteLinks,
          });
        }
      } catch (telegramErr: any) {
        console.error(
          "[Telegram] invite link generation failed after order save:",
          {
            orderId: order._id?.toString(),
            paymentId: order.paymentId,
            subscribedToId,
            type,
            error: telegramErr?.message ?? String(telegramErr),
          },
        );
        logOnboardingIssue({
          step: "telegram_invite",
          severity: "warning",
          reason: "Failed to generate Telegram invite link after order creation",
          errorMessage: telegramErr?.message ?? String(telegramErr),
          customerId: orderById,
          customerName: orderByName,
          customerEmail: orderByEmail,
          spId: soldById,
          spName: soldByName,
          planId: subscribedToId,
          planTitle: serviceName,
          planPrice: total,
          paymentId: order.paymentId ?? undefined,
          orderId: order._id?.toString(),
          metadata: { type, isRenewal },
        });
      }
    }

    /* ---------------- EMAIL ---------------- */

    let telegramHtml = "";

    // Portfolio purchases get a button to the public factsheet page so the buyer
    // can review the portfolio's holdings straight from the confirmation email.
    // Empty for non-portfolio orders (services / packages / courses).
    const factsheetHtml =
      type === "portfolio"
        ? `<div style="text-align:center;margin:20px 0;"><a href="${process.env.NEXTAUTH_URL || process.env.FRONTEND_URL || ""}/view/factsheet/${subscribedToId}" style="display:inline-block;background-color:#01DDAA;color:#fff;padding:12px 24px;border-radius:5px;text-decoration:none;font-weight:bold;font-size:16px;">View Portfolio Factsheet</a></div>`
        : "";

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
        </div>`,
        )
        .join("");
    }

    // Bell notification to the SP — was missing on this gateway path, so the
    // SP only saw the wallet-debit notification ("commission charged") and
    // never a clear "X bought your plan" alert.
    try {
      await sendNotification({
        recipientIds: [String(soldById)].filter(Boolean) as string[],
        recipientRole: "provider",
        message: isRenewal
          ? `${user?.name || "A customer"} renewed your plan ${serviceName}`
          : `${user?.name || "A customer"} purchased your plan ${serviceName}`,
        type: "service",
        category: "admin",
        sentBy: {
          id: String(orderById) || "system",
          name: user?.name || "Customer",
        },
        postLink: "/dashboard/serviceprovider/leads",
        ctaLabel: "View Lead",
      });
    } catch (err) {
      console.error("SP purchase notification failed:", err);
    }

    try {
      await mailQueue.add(
        user?.email!,
        {
          mailOptions: {
            from: process.env.EMAIL,
            to: user?.email,
            cc: serviceProvider.email,
            subject: isRenewal
              ? `Renewal Confirmation for ${serviceName}`
              : `Confirmation for ${serviceName} purchase`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 0 20px;"> <!-- Greeting and Purchase Information --> <p style="font-size: 16px; color: #333; margin-bottom: 20px;">We thank you for choosing the services, kindly download your e-sign documents and join the channel for all the updates by clicking the link given below.</p> <h2 style="text-align: left;">${isRenewal ? 'Renewal Confirmation' : 'Order Confirmation'}</h2> ${autoRenew ? '<div style="background:#f0fdf4;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #22c55e;"><p style="margin:0;color:#166534;font-weight:bold;">✅ Auto-Renewal Active</p><p style="margin:5px 0 0;color:#166534;">Your plan will auto-renew via UPI Auto-Pay. You can cancel anytime from your account settings.</p></div>' : ''} <div style="padding: 10px 0;"> <h4 style="padding-bottom: 5px;">Purchased by:</h4> <h5>Name: <span>${user?.name}</span></h5> <h5>Email: <span>${user?.email}</span></h5> <h5>Purchase Date: <span>${new Date(order.createdAt).toLocaleDateString("en-IN")}\ </span></h5> </div> <table style="width: 100%; border-collapse: collapse; margin-top: 20px;"> <tr> <td style="padding: 10px; border: 1px solid #ddd;">Plan Name</td> <td style="padding: 10px; border: 1px solid #ddd;">${serviceName}</td> </tr> <tr> <td style="padding: 10px; border: 1px solid #ddd;">Price</td> <td style="padding: 10px; border: 1px solid #ddd;">₹${subtotal}</td> </tr> <tr> <td style="padding: 10px; border: 1px solid #ddd;">GST (18%)</td> <td style="padding: 10px; border: 1px solid #ddd;">₹${gst}</td> </tr> <tr> <td style="padding: 10px; border: 1px solid #ddd;">Total Amount</td> <td style="padding: 10px; border: 1px solid #ddd;">₹${total}</td> </tr> </table> ${telegramHtml} <div style="text-align: center; margin: 20px 0;"> <p style="margin-bottom: 15px; font-size: 16px;">Your signed document:</p> <a href="${order.signedDocumentUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 16px;"> View Signed Document </a> </div> <div style="text-align: center; margin: 20px 0;"></div> ${factsheetHtml} <p style="margin-top: 20px; font-size: 14px; color: #555;"> Note: All prices are inclusive of GST. Please save this email for future reference. </p> </div>
            `,
          },
        },
        { removeOnComplete: false, removeOnFail: false },
      );
    } catch (err) {
      console.error("Mail queue failed for marketplace order:", order._id, err);
    }

    try {
      await InvoiceQueueService.add(
        "invoice-queue-service",
        {
          orderId: order._id.toString(),
          userType: "user",

          serviceId: subscribedToId,
          serviceName: serviceName,

          serviceProviderName: soldByName,
          serviceProviderId: soldById,
          serviceprovideremail: serviceProvider.email,
          serviceProviderAddress: [serviceProvider.city, serviceProvider.state].filter(Boolean).join(", "),
          serviceProviderRegistrationNumber: serviceProvider.regNumber,
          serviceProviderWebsite: serviceProvider.website,
          serviceProviderGST: serviceProvider.gst ? serviceProvider.gst : "",
          serviceProviderHSN: serviceProvider.hsnCode ? serviceProvider.hsnCode : "",
          serviceProviderPhone: serviceProvider.number,
          serviceProviderState: serviceProvider.state,

          buyerId: user?.id,
          buyerName: user?.name,
          buyerNumber: user?.number,
          buyerEmail: user?.email,
          buyerPan: user?.pannumber ? user.pannumber : "",

          subtotal,
          gst,
          total,
          discountAmount: discountAmount ?? 0,
          couponCode: coupon?.code ?? undefined,
          validity: /^\d+$/.test(String(validity).trim())
            ? `${validity} days`
            : validity,

          issueDate: order.createdAt,
          serviceStartDate: order.startDate,
          serviceEndDate: order.endDate,
        },
        {
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
    } catch (err) {
      console.error("Invoice queue failed for marketplace order:", order._id, err);
    }

    return res.status(201).json({
      success: true,
      message: "Marketplace order created successfully",
      order,
    });
  } catch (error: any) {
    await session.abortTransaction();

    let ctx: Record<string, any> = {};
    try {
      ctx = JSON.parse(req.body?.data ?? "{}");
    } catch {
      /* ignore — keep ctx empty */
    }

    const paymentId =
      ctx.razorpayPaymentId || ctx.cashfreePaymentId || ctx.paymentId;
    const errorCode = error?.code ? String(error.code) : error?.name;
    const errorMessage = error?.message ?? String(error);

    console.error(
      "[createAndVerifyOrderMarketplace] order creation failed",
      {
        paymentId,
        subscribedToId: ctx.subscribedToId,
        orderById: ctx.orderById,
        marketplaceSlug: ctx.marketplaceSlug,
        type: ctx.type,
        errorCode,
        errorMessage,
        stack: error?.stack,
      },
    );

    logOnboardingIssue({
      step: "order_creation",
      severity: paymentId ? "critical" : "warning",
      reason: paymentId
        ? `Payment captured (${paymentId}) but marketplace order creation failed`
        : "Marketplace order creation failed",
      errorCode,
      errorMessage,
      customerId: ctx.orderById,
      customerName: ctx.orderByName,
      customerEmail: ctx.orderByEmail,
      spId: ctx.soldById,
      spName: ctx.soldByName,
      planId: ctx.subscribedToId,
      planTitle: ctx.serviceName,
      planPrice: ctx.total,
      paymentId,
      stack: error?.stack,
      metadata: {
        handler: "createAndVerifyOrderMarketplace",
        paymentMode: ctx.paymentMode,
        marketplaceSlug: ctx.marketplaceSlug,
        type: ctx.type,
      },
    });

    return res.status(500).json({
      success: false,
      code: "ORDER_CREATE_FAILED",
      message: paymentId
        ? `Payment captured (${paymentId}) but order creation failed. Please contact support.`
        : "Order creation failed. Please try again or contact support.",
      paymentId,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Verify Manual Payment - Phase 2 Operations
 * Called by service provider when they verify the payment proof uploaded by user
 * Executes: wallet deduction, invoice, email, telegram links, subscription activation
 */
export const verifyManualPayment = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.body;

    if (!orderId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    /* ---------------- FIND ORDER ---------------- */

    const order = await OrderModel.findById(orderId).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order is already verified
    if (order.paymentStatus === "verified") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Order payment is already verified",
      });
    }

    // Check if order was rejected
    if (order.paymentStatus === "rejected") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Order payment was rejected. User needs to create a new order.",
      });
    }

    // Check if this is a manual payment
    if (order.paymentMethod !== "Manual") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "This endpoint is only for manual payment verification",
      });
    }

    /* ---------------- FETCH USER & PROVIDER ---------------- */

    const [user, serviceProvider] = await Promise.all([
      UserModel.findById(order.orderdBy?.id),
      ServiceProviderRegModel.findById(order.soldBy?.id),
    ]);

    if (!serviceProvider) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // SP wallet was already debited at e-sign completion (see
    // esignController.handleCallback). The matching WalletTransaction was
    // patched with this order's id when createAndVerifyOrder ran for the
    // manual purchase, so there's nothing to do here.

    /* ---------------- RENEWAL LOGIC ---------------- */

    let extendedEndDate: Date | null = null;

    if (order.isRenewal && order.previousOrderId) {
      const previousOrder = await OrderModel.findById(order.previousOrderId).session(session);

      if (previousOrder) {
        const today = new Date();
        const previousEndDate = new Date(previousOrder.endDate || today);

        // Early renewal: extend from previous end date (preserves remaining days)
        // Expired renewal: start fresh from today
        const baseDate = previousEndDate > today ? previousEndDate : today;
        const newEnd = new Date(baseDate);

        if (order.type === "portfolio") {
          // Legacy portfolios stored validity as "12 months"/"2 years"; new
          // portfolios store a number of days (matching services/packages).
          const validityMatch = order.validity?.match(/(\d+)\s*(month|year)/i);
          if (validityMatch) {
            const num = parseInt(validityMatch[1]) || 0;
            const unit = validityMatch[2].toLowerCase();
            if (unit.startsWith("year")) {
              newEnd.setFullYear(newEnd.getFullYear() + num);
            } else {
              newEnd.setMonth(newEnd.getMonth() + num);
            }
          } else {
            const validityDays = Number(order.validity) || 0;
            newEnd.setDate(newEnd.getDate() + validityDays);
          }
        } else {
          const validityDays = Number(order.validity) || 0;
          newEnd.setDate(newEnd.getDate() + validityDays);
        }

        previousOrder.isRenewed = true;
        previousOrder.renewedAt = new Date();
        previousOrder.endDate = newEnd;

        await previousOrder.save({ session });
        extendedEndDate = newEnd;
      }
    }

    /* ---------------- FETCH PURCHASED ITEM ---------------- */

    let purchasedItem: any;

    if (order.type === "service") {
      purchasedItem = await ServiceModel.findById(order.subscribedToId);
    } else if (order.type === "portfolio") {
      purchasedItem = await Portfolio.findById(order.subscribedToId);
    } else if (order.type === "package") {
      purchasedItem = await PackageModel.findById(order.subscribedToId).populate("includedServices");
    }

    if (!purchasedItem) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `${order.type} not found`,
      });
    }

    /* ---------------- TELEGRAM INVITE LINKS ---------------- */

    let telegramInviteLink: string | null = null;
    let telegramInviteLinks: { serviceName: string; link: string }[] = [];

    // For renewals, check if user is still in channel before creating new invite link
    const userTelegramId = user?.telegramUserId;

    if (order.type === "service" && purchasedItem.telegramChannelId) {
      // For renewals, skip invite link if user is still in channel
      let skipInviteLink = false;
      if (order.isRenewal && userTelegramId) {
        skipInviteLink = await isUserInChannel(
          purchasedItem.telegramChannelId,
          userTelegramId
        );
      }

      if (!skipInviteLink) {
        const invite = await getChannelInviteLink(
          purchasedItem.telegramChannelId,
          "pending",
          order.subscribedToId,
          order.orderdBy?.id!,
        );
        if (invite?.link) telegramInviteLink = invite.link;
      }
    }

    if (order.type === "package") {
      for (const svc of purchasedItem.includedServices || []) {
        if (!svc.telegramChannelId) continue;

        // For renewals, skip invite link if user is still in channel
        let skipInviteLink = false;
        if (order.isRenewal && userTelegramId) {
          skipInviteLink = await isUserInChannel(
            svc.telegramChannelId,
            userTelegramId
          );
        }

        if (!skipInviteLink) {
          const invite = await getChannelInviteLink(
            svc.telegramChannelId,
            "pending",
            order.subscribedToId,
            order.orderdBy?.id!,
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

    /* ---------------- UPDATE ORDER ---------------- */

    // Calculate end date
    const orderEndDate = new Date();
    if (order.type === "portfolio") {
      // Legacy portfolios stored validity as "12 months"/"2 years"; new
      // portfolios store a number of days (matching services/packages).
      const validityMatch = order.validity?.match(/(\d+)\s*(month|year)/i);
      if (validityMatch) {
        const num = parseInt(validityMatch[1]) || 0;
        const unit = validityMatch[2].toLowerCase();
        if (unit.startsWith("year")) {
          orderEndDate.setFullYear(orderEndDate.getFullYear() + num);
        } else {
          orderEndDate.setMonth(orderEndDate.getMonth() + num);
        }
      } else {
        const validityDays = Number(order.validity) || 0;
        orderEndDate.setDate(orderEndDate.getDate() + validityDays);
      }
    } else {
      const validityDays = Number(order.validity) || 0;
      orderEndDate.setDate(orderEndDate.getDate() + validityDays);
    }

    // Update order with verification details
    order.verifiedByRa = true;
    order.paymentStatus = "verified";
    order.startDate = new Date();
    order.endDate = order.isRenewal && extendedEndDate ? extendedEndDate : orderEndDate;
    order.telegramInviteLink = telegramInviteLink || undefined;
    order.telegramInviteLinks = telegramInviteLinks;

    await order.save({ session });

    // Wallet transaction was created at e-sign time and linked to this order
    // when the manual order was first registered in createAndVerifyOrder.

    /* ---------------- DELETE LEAD ---------------- */

    await LeadModel.findOneAndDelete(
      {
        userId: order.orderdBy?.id,
        serviceId: order.subscribedToId,
        providerId: order.soldBy?.id,
      },
      { session },
    );

    /* ---------------- SUBSCRIBE USER ---------------- */

    await UserModel.findByIdAndUpdate(
      order.orderdBy?.id,
      {
        $addToSet: {
          "ServicesAndOrders.services": order.subscribedToId,
        },
      },
      { session }
    );

    if (order.type === "service") {
      await ServiceModel.findByIdAndUpdate(order.subscribedToId, {
        $addToSet: { subscribedBy: order.orderdBy?.id },
      });
    }

    if (order.type === "portfolio") {
      await Portfolio.findByIdAndUpdate(order.subscribedToId, {
        $addToSet: { subscribedBy: order.orderdBy?.id },
      });
    }

    if (order.type === "package") {
      const includedServiceIds = (purchasedItem.includedServices || [])
        .map((svc: any) => svc?._id)
        .filter(Boolean);

      await Promise.all(
        includedServiceIds.map((svcId: any) =>
          ServiceModel.findByIdAndUpdate(svcId, {
            $addToSet: { subscribedBy: order.orderdBy?.id },
          }),
        ),
      );

      // Also push every included service id onto the buyer's
      // ServicesAndOrders.services so each plan appears in the user's
      // "Subscribed Services" sidebar. The earlier write only added the
      // package id, which doesn't match any ServiceModel doc.
      if (includedServiceIds.length > 0 && order.orderdBy?.id) {
        await UserModel.findByIdAndUpdate(
          order.orderdBy.id,
          { $addToSet: { "ServicesAndOrders.services": { $each: includedServiceIds } } },
          { session }
        );
      }
    }

    await session.commitTransaction();

    /* ---------------- NOTIFICATIONS (post-commit) ---------------- */

    // Notify user about payment verification — fans out via the helper so
    // it actually lands in the user's notifications[] array (the legacy
    // .save({ session }) call created an orphan doc the user never saw).
    await sendNotification({
      recipientIds: [order.orderdBy?.id].filter(Boolean) as string[],
      recipientRole: "user",
      message: `Your payment for ${order.serviceName} has been verified. Your subscription is now active!`,
      type: "payment-verified",
      category: "admin",
      sentBy: { id: order.soldBy?.id || "system", name: order.soldBy?.name || "Tradebox" },
      postLink: "/dashboard/user/billing",
      ctaLabel: "View Receipt",
    });

    // Notify SP about the purchase / renewal
    await sendNotification({
      recipientIds: [order.soldBy?.id].filter(Boolean) as string[],
      recipientRole: "provider",
      message: order.isRenewal
        ? `${order.orderdBy?.name} has renewed your plan ${order.serviceName}`
        : `${order.orderdBy?.name} has purchased your plan ${order.serviceName}`,
      type: "service",
      category: "admin",
      sentBy: { id: order.orderdBy?.id || "system", name: order.orderdBy?.name || "Customer" },
      postLink: "/dashboard/serviceprovider/leads",
      ctaLabel: "View Lead",
    });

    /* ---------------- EMAIL (After commit) ---------------- */

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
        <div style="text-align:center;margin:10px 0;">
          <a href="${i.link}" style="background:#0088cc;color:#fff;padding:12px 24px;border-radius:5px;text-decoration:none;">
            Join ${i.serviceName}
          </a>
        </div>`,
        )
        .join("");
    }

    try {
      await mailQueue.add(
        user.email!,
        {
          mailOptions: {
            from: process.env.EMAIL,
            to: user.email,
            cc: serviceProvider.email,
            subject: order.isRenewal
              ? `Renewal Verified - ${order.serviceName} has been renewed`
              : `Payment Verified - ${order.serviceName} is now active`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 0 20px;">
                <h2 style="text-align: left; color: #28a745;">${order.isRenewal ? 'Renewal Verified!' : 'Payment Verified!'}</h2>
                <p>Your payment has been verified and your ${order.isRenewal ? 'renewal' : 'subscription'} is now active.</p>
                <div style="padding: 10px 0;">
                  <h4 style="padding-bottom: 5px;">Purchased by:</h4>
                  <h5>Name: <span>${user.name}</span></h5>
                  <h5>Email: <span>${user.email}</span></h5>
                  <h5>Verification Date: <span>${new Date().toLocaleDateString("en-IN")}</span></h5>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${order.type === "package" ? "Package Name" : order.type === "portfolio" ? "Portfolio Name" : order.type === "event" ? "Event Name" : "Plan Name"}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${order.serviceName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">Price</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${order.subtotal}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">GST (18%)</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${order.gst}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">Total Amount</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">₹${order.total}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">Service Start Date</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${order.startDate?.toLocaleDateString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">Service End Date</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${order.endDate?.toLocaleDateString("en-IN")}</td>
                  </tr>
                </table>
                ${telegramHtml}
                <div style="text-align: center; margin: 20px 0;">
                  <p style="margin-bottom: 15px; font-size: 16px;">Your signed document:</p>
                  <a href="${order.signedDocumentUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 16px;">
                    View Signed Document
                  </a>
                </div>
                <div style="margin-top: 30px; padding: 20px; background-color: #111; border-radius: 8px; border: 1px solid #333;">
                  <h2 style="color: #ffcc00; margin-bottom: 15px; font-family: Arial, sans-serif; text-align: center;">Customer Support</h2>
                  <div style="display: flex; justify-content: center; align-items: center; gap: 6px; margin-bottom: 8px;">
                    <span style="font-size: 18px;">📞</span>
                    <a href="tel:+917827531843" style="color: #fff; font-size: 16px; text-decoration: none;">+91 78275 31843</a>
                  </div>
                  <div style="display: flex; justify-content: center; align-items: center; gap: 6px; margin-bottom: 12px;">
                    <span style="font-size: 18px;">📧</span>
                    <a href="mailto:info@tradeboxlive.com" style="color: #fff; font-size: 16px; text-decoration: none;">info@tradeboxlive.com</a>
                  </div>
                  <p style="color: #bbb; font-size: 14px; text-align: center; margin: 0;">
                    Available Mon–Sat, 9:00 AM – 6:00 PM
                  </p>
                </div>
                <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
                  
                </p>
              </div>
            `,
          },
        },
        { removeOnComplete: false, removeOnFail: false },
      );
    } catch (err) {
      console.error("Mail queue failed for order:", order._id, err);
    }

    /* ---------------- INVOICE ---------------- */

    try {
      await InvoiceQueueService.add(
        "invoice-queue-service",
        {
          orderId: order._id.toString(),
          userType: "user",

          serviceId: order.subscribedToId,
          serviceName: order.serviceName,

          serviceProviderName: order.soldBy?.name,
          serviceProviderId: order.soldBy?.id,
          serviceprovideremail: serviceProvider.email,
          serviceProviderAddress: [serviceProvider.city, serviceProvider.state].filter(Boolean).join(", "),
          serviceProviderRegistrationNumber: serviceProvider.regNumber,
          serviceProviderWebsite: serviceProvider.website,
          serviceProviderGST: serviceProvider.gst ? serviceProvider.gst : "",
          serviceProviderHSN: serviceProvider.hsnCode ? serviceProvider.hsnCode : "",
          serviceProviderPhone: serviceProvider.number,
          serviceProviderState: serviceProvider.state,

          buyerId: user.id,
          buyerName: user.name,
          buyerNumber: user.number,
          buyerEmail: user.email,
          buyerPan: user.pannumber ? user.pannumber : "",

          subtotal: order.subtotal,
          gst: order.gst,
          total: order.total,
          discountAmount: order.discountAmount ?? 0,
          couponCode: (order.coupon as any)?.code ?? undefined,
          // For service/package, append "days" if not already present
          validity: /^\d+$/.test(String(order.validity).trim())
            ? `${order.validity} days`
            : order.validity,

          issueDate: order.createdAt,
          serviceStartDate: order.startDate,
          serviceEndDate: order.endDate,
        },
        {
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
    } catch (err) {
      console.error("Invoice queue failed for order:", order._id, err);
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully. Order is now active.",
      order,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error verifying manual payment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  } finally {
    session.endSession();
  }
};

/**
 * Reject Manual Payment
 * Called by service provider when they reject the payment proof uploaded by user
 */
export const rejectManualPayment = async (req: Request, res: Response) => {
  try {
    const { orderId, reason } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const order = await OrderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order is already verified
    if (order.paymentStatus === "verified") {
      return res.status(400).json({
        success: false,
        message: "Cannot reject an already verified order",
      });
    }

    // Check if this is a manual payment
    if (order.paymentMethod !== "Manual") {
      return res.status(400).json({
        success: false,
        message: "This endpoint is only for manual payment rejection",
      });
    }

    // Update order status
    order.paymentStatus = "rejected";
    order.rejectionReason = reason || "Payment proof rejected by service provider";
    await order.save();

    // Send notification to user
    await sendNotification({
      recipientIds: [order.orderdBy?.id].filter(Boolean) as string[],
      recipientRole: "user",
      message: `Your payment for ${order.serviceName} has been rejected. Reason: ${order.rejectionReason}`,
      type: "payment-rejected",
      category: "admin",
      sentBy: { id: order.soldBy?.id || "system", name: order.soldBy?.name || "Tradebox" },
      postLink: "/dashboard/user/billing",
      ctaLabel: "View Details",
    });

    // Send email to user about rejection
    const user = await UserModel.findById(order.orderdBy?.id);
    if (user?.email) {
      try {
        await mailQueue.add(
          user.email,
          {
            mailOptions: {
              from: process.env.EMAIL,
              to: user.email,
              subject: `Payment Rejected - ${order.serviceName}`,
              html: `
                <div style="font-family: Arial, sans-serif; padding: 0 20px;">
                  <h2 style="text-align: left; color: #dc3545;">Payment Rejected</h2>
                  <p>Unfortunately, your payment proof for <strong>${order.serviceName}</strong> has been rejected.</p>
                  <div style="padding: 15px; background-color: #f8d7da; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0; color: #721c24;"><strong>Reason:</strong> ${order.rejectionReason}</p>
                  </div>
                  <p>Please upload a valid payment proof or contact the service provider for assistance.</p>
                  <div style="margin-top: 30px; padding: 20px; background-color: #111; border-radius: 8px; border: 1px solid #333;">
                    <h2 style="color: #ffcc00; margin-bottom: 15px; font-family: Arial, sans-serif; text-align: center;">Customer Support</h2>
                    <div style="display: flex; justify-content: center; align-items: center; gap: 6px; margin-bottom: 8px;">
                      <span style="font-size: 18px;">📞</span>
                      <a href="tel:+917827531843" style="color: #fff; font-size: 16px; text-decoration: none;">+91 78275 31843</a>
                    </div>
                    <div style="display: flex; justify-content: center; align-items: center; gap: 6px; margin-bottom: 12px;">
                      <span style="font-size: 18px;">📧</span>
                      <a href="mailto:info@tradeboxlive.com" style="color: #fff; font-size: 16px; text-decoration: none;">info@tradeboxlive.com</a>
                    </div>
                  </div>
                </div>
              `,
            },
          },
          { removeOnComplete: false, removeOnFail: false },
        );
      } catch (err) {
        console.error("Mail queue failed for rejection:", order._id, err);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment rejected successfully",
      order,
    });
  } catch (error) {
    console.error("Error rejecting manual payment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/** Parse day count from stored order validity ("30", "30 days", etc.) */
function parseValidityDaysFromStored(v: string | undefined): number {
  if (v == null || v === "") return 0;
  const m = String(v).match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

/**
 * Get user's order for a specific service
 * Used by frontend to show subscription status and enable renewal.
 * Optional query `validityDays` scopes to the pricing tier (same duration in days).
 */
export const getUserOrderForService = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const { userId, validityDays } = req.query;

    if (!serviceId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Service ID and User ID are required",
      });
    }

    const baseQuery = {
      subscribedToId: serviceId,
      "orderdBy.id": userId as string,
      paymentStatus: "verified" as const,
    };

    const candidates = await OrderModel.find(baseQuery)
      .sort({ createdAt: -1 })
      .lean();

    let order: (typeof candidates)[number] | null = candidates[0] ?? null;

    if (validityDays !== undefined && validityDays !== "") {
      const days = parseInt(String(validityDays), 10);
      if (!Number.isNaN(days)) {
        order =
          candidates.find(
            (o) => parseValidityDaysFromStored(o.validity) === days
          ) ?? null;
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "No order found for this service",
      });
    }

    // Calculate days remaining
    const today = new Date();
    const endDate = order.endDate ? new Date(order.endDate) : null;
    let daysRemaining = 0;
    let isExpired = order.isExpired;

    if (endDate) {
      daysRemaining = Math.ceil(
        (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysRemaining < 0) {
        daysRemaining = 0;
        isExpired = true;
      }
    }

    return res.status(200).json({
      success: true,
      order: {
        _id: order._id,
        serviceName: order.serviceName,
        startDate: order.startDate,
        endDate: order.endDate,
        validity: order.validity,
        isExpired,
        daysRemaining,
        isRenewed: order.isRenewed,
        paymentStatus: order.paymentStatus,
        total: order.total,
        subtotal: order.subtotal,
        gst: order.gst,
      },
    });
  } catch (error) {
    console.error("Error fetching user order:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const VerifyPaymentRA = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.body;

    if (!id) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Order ID is required" });
    }
    console.log("1");

    // Find the order by ID
    const order = await OrderModel.findById(id).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    console.log("2");

    // Update the order's verifiedByRa field
    order.verifiedByRa = true;
    order.startDate = new Date();
    // Extract number of days from validity (e.g., "30 days", "60 days")
    const daysMatch = order.validity?.match(/\d+/);
    const daysToAdd = daysMatch ? parseInt(daysMatch[0], 10) : 0;

    if (daysToAdd) {
      const endDate = new Date(order.startDate);
      endDate.setDate(endDate.getDate() + daysToAdd);
      order.endDate = endDate;
    }
    await order.save({ session });
    console.log("3");

    await UserModel.findByIdAndUpdate(
      order?.orderdBy?.id,
      {
        $addToSet: {
          "ServicesAndOrders.services": order?.subscribedToId,
          "ServicesAndOrders.orders": order._id,
        },
      },
      { session }
    );
    console.log("4");

    // **User Notifications**
    await new notificationModel({
      message: order.isRenewal
        ? `${order.orderdBy?.name} has renewed your plan ${order.serviceName}`
        : `${order.orderdBy?.name} has purchased your plan ${order.serviceName}`,
      sendTo: [{ id: order.soldBy?.id, name: order.soldBy?.name }],
      sentBy: { id: order.orderdBy?.id, name: order.orderdBy?.name },
      type: "service",
    }).save({ session });
    console.log("5");
    const serviceProvider = await ServiceProviderRegModel.findById(
      order.soldBy?.id
    ).session(session);

    if (!serviceProvider) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Service provider not found" });
    }
    console.log("6");

    const subscription = await TradeboxPlansModel.findById(
      serviceProvider?.subscriptionDetails?.currentSubscription
    ).session(session);

    if (!subscription) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Service provider has no active subscription",
      });
    }
    console.log("7");

    let amountToBeDeducted = 0;
    const isNewCustomer = !serviceProvider.ServicesAndOrders?.orders?.some(
      (orderId) => orderId.toString() === order.orderdBy?.id.toString()
    );
    // ALWAYS ADD FIXED COMMERCIAL FEE (if it exists)
    if (
      subscription.fixedCommercialFee &&
      subscription.fixedCommercialFee > 0
    ) {
      amountToBeDeducted += subscription.fixedCommercialFee;
    }

    // Calculate amount to be deducted based on subscription plan
    if (subscription.plan === "Prepaid") {
      // For Prepaid plan

      // Check if customer limit is exceeded and add additional charge
      const currentCustomerCount =
        serviceProvider.ServicesAndOrders?.orders?.length || 0;

      const customerLimit = subscription && subscription?.customerLimit;

      if (customerLimit) {
        if (currentCustomerCount >= customerLimit) {
          // Customer limit exceeded, apply additional charge
          amountToBeDeducted += subscription.renewalCharge || 0;
        } else if (isNewCustomer) {
          // New customer within limit, apply fresh onboarding charge
          amountToBeDeducted += subscription.freshOnboardingCharge || 0;
        }
      }

      // Update customer count in subscription
      await subscription.updateOne(
        {
          currentCustomerCount: currentCustomerCount + 1,
        },
        { session }
      );
    } else if (subscription.plan === "Postpaid") {
      // For Postpaid plan

      if (subscription.pricingType === "Percentage" && order.subtotal) {
        // Percentage-based pricing
        const amountExcludingGst = order.subtotal;
        if (isNewCustomer && subscription.percentageFreshOnboarding) {
          // For fresh onboarding
          const percentageDeduction =
            (subscription.percentageFreshOnboarding / 100) * amountExcludingGst;
          amountToBeDeducted += percentageDeduction;
        } else if (!isNewCustomer && subscription.percentageRenewal) {
          // For renewal
          const percentageDeduction =
            (subscription.percentageRenewal / 100) * amountExcludingGst;
          amountToBeDeducted += percentageDeduction;
        }
      } else {
        // Fixed pricing
        if (isNewCustomer) {
          // For fresh onboarding
          amountToBeDeducted += subscription.fixedFreshOnboardingCharge || 0;
        } else {
          // For renewal
          amountToBeDeducted += subscription.fixedRenewalCharge || 0;
        }
      }
    }
    console.log("8");

    const serviceTaker = await UserModel.findById(order.orderdBy?.id).session(
      session
    );
    // console.log(serviceTaker)

    if (!serviceTaker) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Service taker not found" });
    }
    console.log("9");

    // Add 18% GST to the calculated amount
    amountToBeDeducted *= 1.18;

    if (serviceProvider.wallet.amount > amountToBeDeducted) {
      serviceProvider.wallet.amount -= amountToBeDeducted;
      await serviceProvider.save({ session });
      await notifyWalletChange({
        spId: String(serviceProvider._id),
        spName: serviceProvider.RegName,
        amount: amountToBeDeducted,
        direction: "debit",
        reason: order.isRenewal
          ? `renewal commission for ${order.serviceName}`
          : `onboarding commission for ${order.serviceName}`,
        newBalance: serviceProvider.wallet.amount,
        session,
      });
    } else {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Insufficient funds to cover additional fee",
      });
    }

    await WalletTransactionModel.create(
      [
        {
          serviceProviderId: serviceProvider._id,
          orderdBy: {
            name: order.orderdBy?.name,
            id: order.orderdBy?.id,
            email: order.orderdBy?.email,
          },
          paymentId: order.paymentId || "N/A",
          orderId: order._id,
          amount: amountToBeDeducted,
          type: "Onboarding-Charge",
        },
      ],
      { session }
    );

    console.log("10");

    const serviceFromServiceModel = await ServiceModel.findById(
      order.subscribedToId
    ).session(session);
    const serviceFromPortfolioModel = serviceFromServiceModel
      ? null
      : await Portfolio.findById(order.subscribedToId).session(session);

    const service = serviceFromServiceModel || serviceFromPortfolioModel;

    if (!service) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Service not found!",
      });
    }
    console.log("11");

    if (serviceFromServiceModel) {
      await ServiceModel.findByIdAndUpdate(order.subscribedToId, {
        $addToSet: { subscribedBy: order.orderdBy?.id },
      }).session(session);
    } else if (serviceFromPortfolioModel) {
      await Portfolio.findByIdAndUpdate(order.subscribedToId, {
        $addToSet: { subscribedBy: order.orderdBy?.id },
      }).session(session);
    }

    /* ---------------- DELETE LEAD ---------------- */
    await LeadModel.findOneAndDelete(
      {
        userId: order.orderdBy?.id,
        serviceId: order.subscribedToId,
        providerId: order.soldBy?.id,
      },
      { session }
    );

    console.log("12");

    const channelId = service?.telegramChannelId;

    let inviteLink: { link: string } | undefined;
    if (channelId) {
      inviteLink = await getChannelInviteLink(
        channelId,
        order?._id.toString(),
        order?.subscribedToId,
        order?.orderdBy?.id!
      );

      if (!inviteLink) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Invite link not found!",
        });
      }
    } else {
      console.warn(
        "No Telegram Channel ID found for this service. Continuing without invite link..."
      );
    }

    console.log("13");
    console.log(inviteLink?.link);

    const hasGST = !!serviceProvider.gst; // <-- New constant for GST check

    // // **Trigger Invoice Queue for Users**
    await InvoiceQueueService.add(
      order._id.toString(),
      {
        orderId: order._id,
        buyerId: order.orderdBy?.id,
        serviceName: order.serviceName,
        serviceId: order.subscribedToId,
        serviceProviderName: order.soldBy?.name,
        serviceProviderId: order.soldBy?.id,
        spaddress1: serviceProvider.address1,
        spaddress2: serviceProvider.address2,
        spcity: serviceProvider.city,
        spstate: serviceProvider.state,
        sebiRegNumber: serviceProvider.regNumber,
        buyerName: serviceTaker.name,
        // buyerAddress1: userAddress.addressLine1,
        // buyerAddress2: userAddress.addressLine2,
        // buyerCityStateZip: userAddress.cityStateZip,
        issueDate: new Date(order.createdAt).toLocaleDateString("en-IN"),
        subtotal: order.subtotal,
        gst: order.gst,
        total: order.total,
        discountAmount: order.discountAmount ?? 0,
        couponCode: (order.coupon as any)?.code ?? undefined,
        userType: "user",
        validity: order.validity.split(",")[0],
        inviteLink: inviteLink,
        hasGST,
        signedDocument: order.signedDocumentUrl,
        serviceprovideremail: serviceProvider.email,
        invitelink: inviteLink?.link,
        chatId: service.telegramChannelId,
        investorcharter: serviceProvider.investorCharter,
      },
      { removeOnComplete: true, removeOnFail: true }
    )
      .then(() => console.log("Invoice queued successfully"))
      .catch((err) => console.error("Invoice queueing failed:", err));

    // console.log(
    //   `Invoice successfully added to queue for Order ID: ${order._id}`
    // );

    // await adminNotify(
    //   `Wallet got credited with ${order.amount} from ${order.orderdBy?.name} for ${order.serviceName}`
    // );

    console.log("14");
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Purchase verified successfully",
      order,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error verifying purchase:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const getLeadsByServiceProvider = async (
  req: Request,
  res: Response
) => {
  try {
    const providerId = req.user.id; // from auth middleware
    const { type } = req.query; // service | portfolio (optional)

    // Pool the whole profile family so a Non-Individual master AND its
    // sub-profiles all see the firm's leads. Leads are captured against the
    // master (or whichever RA owns the plan), so a sub-profile querying only
    // its own id would see nothing. Resolves:
    //   master    -> master + all sub-profiles
    //   admin sub  -> the master's whole family (master + siblings)
    //   user sub   -> just itself
    //   individual -> just itself
    const authorIds = await getProfileFamilyIds(String(providerId));

    const filter: any = {
      providerId: { $in: authorIds },
      status: { $nin: ["payment_success", "converted"] },
    };
    if (type) filter.type = type;

    const leads = await LeadModel.find(filter).sort({ createdAt: -1 }).lean();
    // console.log("leads", leads)

    /* ---------------- USERS ---------------- */
    const userIds = [...new Set(leads.map((l) => l.userId))];

    // Include PAN + DOB so the convert dialog can pre-fill KYC for leads
    // whose user already supplied those at registration / checkout.
    const users = await UserModel.find(
      { _id: { $in: userIds } },
      "name email number pannumber dob"
    ).lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    /* ---------------- SERVICES ----------------
       Extend the projections with pricingPlans (Service/Package) and
       fees/feeValidity (Portfolio) so the SP-side dialog can render the
       validity dropdown and auto-fill subtotal/GST/total. */
    const serviceIds = [...new Set(leads.map((l) => l.serviceId))];

    const services = await ServiceModel.find(
      { _id: { $in: serviceIds } },
      "title authorId pricingPlans"
    ).lean();

    const portfolios = await Portfolio.find(
      { _id: { $in: serviceIds } },
      "portfolioName authorData fees feeValidity pricingPlans"
    ).lean();

    const packages = await PackageModel.find(
      { _id: { $in: serviceIds } },
      "title authorData pricingPlans"
    ).lean();

    const serviceMap = new Map(services.map((s) => [s._id.toString(), s]));

    const portfolioMap = new Map(portfolios.map((p) => [p._id.toString(), p]));

    const packageMap = new Map(packages.map((p) => [p._id.toString(), p]));

    // Same SP across every lead in this response — load once for the
    // GST flag the dialog uses to compute 18% on a tier-pick.
    const spForGst = await ServiceProviderRegModel.findById(providerId)
      .select("gst")
      .lean();
    const spChargesGst = Boolean((spForGst as any)?.gst);

    /* ---------------- ESIGN DOCS ----------------
       Pull signedDocURL for any lead whose user has a COMPLETED EsignSession
       for that service — not just leads still at `esign_completed`. Once the
       user moves on to checkout/payment the lead status advances, but the SP
       still needs visibility into the signed PDF from their dashboard.
    */
    const esignDocByKey = new Map<string, string>();
    // Pricing snapshot from the cartItem persisted on the e-sign session.
    // Used by the convert dialog to seed the coupon-application call.
    const cartSnapshotByKey = new Map<
      string,
      { subtotal?: number; validity?: number | string; isGST?: boolean }
    >();
    if (leads.length > 0) {
      const sessions = await EsignSessionModel.find({
        $or: leads.map((l) => ({
          userId: l.userId,
          serviceId: l.serviceId,
          status: "COMPLETED",
          signedDocURL: { $exists: true, $ne: null },
        })),
      })
        .select("userId serviceId signedDocURL metadata")
        .lean();

      for (const s of sessions) {
        esignDocByKey.set(`${s.userId}_${s.serviceId}`, s.signedDocURL as string);
        const cart = (s.metadata as any)?.cartItem;
        if (cart) {
          cartSnapshotByKey.set(`${s.userId}_${s.serviceId}`, {
            // Prefer basePrice (canonical original) over subtotal — when the
            // customer pre-applied a coupon at e-sign time, cart.subtotal is
            // the post-discount value and using it as the SP's coupon baseline
            // would re-discount an already-discounted number.
            subtotal:
              typeof cart.basePrice === "number"
                ? cart.basePrice
                : typeof cart.subtotal === "number"
                ? cart.subtotal
                : undefined,
            validity: cart.validity,
            isGST: Boolean(cart.isGST),
          });
        }
      }
    }

    /* ---------------- MERGE ---------------- */
    const formatted = leads.map((l) => {
      const user = userMap.get(l.userId);

      let itemName = "";
      let providerId = "";
      let pricingPlans: { validity: number; price: number }[] = [];
      let portfolioFeeValidity: string | null = null;

      if (l.type === "service") {
        const s = serviceMap.get(l.serviceId);
        itemName = s?.title || "Deleted Service";
        providerId = s?.authorData?.id || "";
        pricingPlans = ((s as any)?.pricingPlans ?? [])
          .map((p: any) => ({
            validity: Number(p?.validity),
            price: Number(p?.price),
          }))
          .filter(
            (p: any) =>
              Number.isFinite(p.validity) && Number.isFinite(p.price),
          );
      }

      if (l.type === "portfolio") {
        const p = portfolioMap.get(l.serviceId);
        itemName = p?.portfolioName || "Deleted Portfolio";
        providerId = p?.authorData?.id || "";
        const plans = (p as any)?.pricingPlans;
        if (Array.isArray(plans) && plans.length > 0) {
          // New multi-tier portfolios — expose real day-based plans so the
          // dialog renders a per-plan dropdown like services/packages.
          pricingPlans = plans
            .map((pl: any) => ({
              validity: Number(pl?.validity),
              price: Number(pl?.price),
            }))
            .filter(
              (pl: any) =>
                Number.isFinite(pl.validity) && Number.isFinite(pl.price),
            );
        } else if (typeof (p as any)?.fees === "number") {
          // Legacy single-tier — validity = 0 signals "use the
          // portfolioFeeValidity label instead".
          pricingPlans = [{ validity: 0, price: (p as any).fees }];
        }
        portfolioFeeValidity = (p as any)?.feeValidity ?? null;
      }

      if ((l.type as string) === "package") {
        const pkg = packageMap.get(l.serviceId);
        itemName = pkg?.title || "Deleted Package";
        providerId = pkg?.authorData?.id || "";
        pricingPlans = ((pkg as any)?.pricingPlans ?? [])
          .map((p: any) => ({
            validity: Number(p?.validity),
            price: Number(p?.price),
          }))
          .filter(
            (p: any) =>
              Number.isFinite(p.validity) && Number.isFinite(p.price),
          );
      }

      const signedDocURL =
        esignDocByKey.get(`${l.userId}_${l.serviceId}`) ?? null;
      const cart = cartSnapshotByKey.get(`${l.userId}_${l.serviceId}`);

      return {
        kind: "lead" as const,
        _id: l._id,
        type: l.type,
        subscribedToId: l.serviceId,
        serviceName: itemName,
        status: l.status,
        salesStatus: (l as any).salesStatus || "Open",
        salesStatusDescription: (l as any).salesStatusDescription || "",
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,

        user: user
          ? {
              id: user._id,
              name: user.name,
              email: user.email,
              number: user.number,
              pannumber: (user as any).pannumber ?? undefined,
              dob: (user as any).dob ?? undefined,
            }
          : null,

        serviceProviderId: providerId,
        signedDocURL,
        cartSubtotal: cart?.subtotal ?? null,
        cartValidity: cart?.validity ?? null,
        cartIsGST: cart?.isGST ?? null,
        pricingPlans,
        portfolioFeeValidity,
        spChargesGst,
      };
    });

    // console.log("formatter", formatted)

    /* ---------------- PENDING / REJECTED MANUAL ORDERS ----------------
       A manual payment creates an Order with paymentStatus "pending" and
       deletes its Lead, so these never appear as Lead rows. Surface them in
       the leads list so the SP can Verify (→ becomes a Subscriber) or Reject.
       Rejected orders are kept here as an audit row (no action). */
    const pendingManualOrders = await OrderModel.find({
      "soldBy.id": providerId,
      paymentMethod: "Manual",
      paymentStatus: { $in: ["pending", "rejected"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    const orderUserIds = [
      ...new Set(pendingManualOrders.map((o) => o.orderdBy?.id).filter(Boolean)),
    ];
    const orderUsers = await UserModel.find(
      { _id: { $in: orderUserIds } },
      "name email number pannumber dob",
    ).lean();
    const orderUserMap = new Map(orderUsers.map((u) => [u._id.toString(), u]));

    const pendingRows = pendingManualOrders.map((o) => {
      const buyer = o.orderdBy?.id
        ? orderUserMap.get(o.orderdBy.id.toString())
        : undefined;
      return {
        kind: "pending_order" as const,
        _id: o._id,
        orderId: o._id,
        type: o.type || "service",
        subscribedToId: o.subscribedToId,
        serviceName: o.serviceName,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        rejectionReason: (o as any).rejectionReason ?? null,
        subtotal: o.subtotal,
        gst: o.gst,
        total: o.total,
        validity: o.validity,
        isRenewal: (o as any).isRenewal ?? false,
        paymentProof: o.paymentProof ?? null,
        signedDocURL: o.signedDocumentUrl ?? null,
        kycDetails: o.kycDetails ?? null,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        user: {
          id: o.orderdBy?.id,
          name: o.orderdBy?.name || buyer?.name,
          email: o.orderdBy?.email || buyer?.email,
          number: buyer?.number,
          pannumber: (buyer as any)?.pannumber ?? undefined,
          dob: (buyer as any)?.dob ?? undefined,
        },
        // Neutral defaults so the shared lead-row UI never crashes on these.
        status: o.paymentStatus,
        salesStatus: "Open",
        salesStatusDescription: "",
        serviceProviderId: providerId,
        pricingPlans: [],
        portfolioFeeValidity: null,
        spChargesGst,
      };
    });

    // Pin pending verifications to the top, then rejected, then the leads.
    const rank = (r: any) =>
      r.kind === "pending_order"
        ? r.paymentStatus === "pending"
          ? 0
          : 1
        : 2;
    const data = [...pendingRows, ...formatted].sort((a, b) => {
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return (
        new Date(b.createdAt as any).getTime() -
        new Date(a.createdAt as any).getTime()
      );
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("❌ Error fetching leads:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * SP-only PATCH for the sales outcome of a lead.
 * Body: { salesStatus, salesStatusDescription? }
 *
 * Distinct from `updateLead` (which is fired by checkout/login flows to move
 * leads through the conversion funnel). This endpoint only writes to the
 * SP-controlled `salesStatus` / `salesStatusDescription` fields and refuses
 * to touch leads that don't belong to the calling provider.
 */
const ALLOWED_SALES_STATUSES = [
  "Open",
  "Still in Process",
  "Not Interested",
  "Closed",
  "Others",
] as const;

export const updateLeadSalesStatus = async (req: Request, res: Response) => {
  try {
    const providerId = req.user?.id;
    if (!providerId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const { leadId } = req.params;
    const { salesStatus, salesStatusDescription } = req.body ?? {};

    if (!leadId) {
      return res
        .status(400)
        .json({ success: false, message: "Lead ID is required" });
    }
    if (
      typeof salesStatus !== "string" ||
      !ALLOWED_SALES_STATUSES.includes(salesStatus as any)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sales status" });
    }

    const trimmedDescription =
      typeof salesStatusDescription === "string"
        ? salesStatusDescription.trim()
        : "";

    if (salesStatus === "Others" && !trimmedDescription) {
      return res.status(400).json({
        success: false,
        message: "Description is required when status is 'Others'",
      });
    }

    const updated = await LeadModel.findOneAndUpdate(
      { _id: leadId, providerId },
      {
        $set: {
          salesStatus,
          salesStatusDescription:
            salesStatus === "Others" ? trimmedDescription : "",
        },
      },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: updated._id,
        salesStatus: (updated as any).salesStatus,
        salesStatusDescription: (updated as any).salesStatusDescription || "",
      },
    });
  } catch (error) {
    console.error("updateLeadSalesStatus error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * SP-initiated hard delete of a lead. Scoped to the calling provider so an SP
 * can't delete leads they don't own. The Lead is a CRM record only — no
 * cascading cleanup is needed (orders, e-sign sessions, etc. are independent).
 */
export const deleteLead = async (req: Request, res: Response) => {
  try {
    const providerId = req.user?.id;
    if (!providerId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const { leadId } = req.params;
    if (!leadId) {
      return res
        .status(400)
        .json({ success: false, message: "Lead ID is required" });
    }

    const result = await LeadModel.deleteOne({
      _id: leadId,
      providerId: String(providerId),
    });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Lead deleted" });
  } catch (error) {
    console.error("deleteLead error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * Manually convert a lead that already passed e-sign into a verified subscriber
 * order. Mirrors the post-verification half of createAndVerifyOrder's gateway
 * path: telegram links, order create, wallet-tx patch, lead delete, user
 * subscribe, confirmation email, invoice. Skips Razorpay/Cashfree signature
 * verification because there was no platform payment.
 *
 * Used when a user finishes e-sign but never completes payment on the platform
 * (e.g. paid offline, gateway webhook lost). The onboarding charge is normally
 * debited at e-sign completion; if that didn't happen (legacy session, or SP
 * had no Tradebox plan at the time), this endpoint debits on demand using the
 * same debitOnboardingCharge helper before creating the order.
 */
export const convertLeadToSubscriber = async (
  req: Request,
  res: Response
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const providerId = req.user?.id;
    if (!providerId) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const { leadId } = req.params;
    const note =
      typeof req.body?.note === "string" ? req.body.note.trim() : "";
    const couponCode =
      typeof req.body?.couponCode === "string"
        ? req.body.couponCode.trim()
        : "";

    // Manual overrides supplied by the SP for leads at any funnel stage —
    // when fields are missing from the e-sign session (or there's no e-sign
    // session at all) these are how the SP supplies the missing data.
    const toFiniteNumber = (v: unknown): number | undefined => {
      if (v === undefined || v === null || v === "") return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const manualSignedDocFile = req.file as
      | Express.MulterS3.File
      | undefined;
    const manualSignedDocUrl = manualSignedDocFile?.location || undefined;
    const manualSubtotal = toFiniteNumber(req.body?.subtotal);
    const manualGst = toFiniteNumber(req.body?.gst);
    const manualTotal = toFiniteNumber(req.body?.total);
    const manualValidity =
      typeof req.body?.validity === "string" && req.body.validity.trim()
        ? req.body.validity.trim()
        : undefined;
    const manualKyc = {
      aadhaarUrl:
        typeof req.body?.aadhaarUrl === "string" && req.body.aadhaarUrl.trim()
          ? req.body.aadhaarUrl.trim()
          : undefined,
      panUrl:
        typeof req.body?.panUrl === "string" && req.body.panUrl.trim()
          ? req.body.panUrl.trim()
          : undefined,
      panNumber:
        typeof req.body?.panNumber === "string" && req.body.panNumber.trim()
          ? req.body.panNumber.trim()
          : undefined,
      dob:
        typeof req.body?.dob === "string" && req.body.dob.trim()
          ? req.body.dob.trim()
          : undefined,
    };

    if (!leadId) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Lead ID is required" });
    }

    /* ---------------- LOAD LEAD + AUTHORIZE ---------------- */

    const lead = await LeadModel.findById(leadId).lean();
    if (!lead) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    if ((lead as any).providerId !== String(providerId)) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(403)
        .json({ success: false, message: "You do not own this lead" });
    }

    /* ---------------- LOAD E-SIGN SESSION (optional) ----------------
       The e-sign session is no longer required — SPs can convert leads at
       any funnel stage. When a session exists we use its signedDocURL +
       cartItem snapshot + walletTransactionId as defaults; SP-supplied
       manual fields always override them. We also dropped the Aadhaar
       match gate — KYC is now an SP-managed field on the dialog. */
    const esignSession = await EsignSessionModel.findOne({
      userId: (lead as any).userId,
      serviceId: (lead as any).serviceId,
      status: "COMPLETED",
    }).sort({ updatedAt: -1 });

    // May be null on legacy / pre-e-sign leads. Downstream code treats it
    // as optional.
    let esignWalletTransactionId = esignSession?.walletTransactionId;

    /* ---------------- IDEMPOTENCY ----------------
       Synthetic paymentId keyed on the lead id so a double-click /
       network retry doesn't create a second order. Matches the gateway
       path's pattern at PaymentController.ts:2214. */
    const syntheticPaymentId = `manual_convert_${leadId}`;
    const existing = await OrderModel.findOne({
      paymentId: syntheticPaymentId,
    });
    if (existing) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({
        success: true,
        message: "Lead already converted",
        order: existing,
        idempotent: true,
      });
    }

    /* ---------------- DERIVE ORDER PARAMS ----------------
       Precedence (highest → lowest):
         1. SP-typed manual fields from the dialog
         2. e-sign session cartItem snapshot (when present)
         3. purchased-item fallback (computed further below)
       Legacy sessions and pre-e-sign leads both flow through here cleanly. */
    const cartItem = (esignSession?.metadata as any)?.cartItem ?? {};

    let subtotal: number | null =
      manualSubtotal ??
      (typeof cartItem.basePrice === "number"
        ? cartItem.basePrice
        : typeof cartItem.subtotal === "number"
        ? cartItem.subtotal
        : null);
    let gst: number =
      manualGst ??
      (typeof cartItem.gst === "number"
        ? cartItem.gst
        : typeof cartItem.gstAmount === "number"
        ? cartItem.gstAmount
        : 0);
    let total: number | null =
      manualTotal ??
      (typeof cartItem.total === "number"
        ? cartItem.total
        : typeof cartItem.totalPrice === "number"
        ? cartItem.totalPrice
        : null);
    let validity: string | number | undefined =
      manualValidity ?? cartItem.validity;
    const cartType: "service" | "portfolio" | "package" =
      cartItem.type || (lead as any).type || "service";
    const subscribedToId: string =
      cartItem.subscribedToId || (lead as any).serviceId;
    const serviceName: string =
      cartItem.title || cartItem.serviceName || "service";
    const soldById: string =
      cartItem.soldById || cartItem.authorId || providerId;
    const soldByName: string =
      cartItem.soldByName || cartItem.authorName || "";

    /* ---------------- LOAD USER, SP, PURCHASED ITEM ---------------- */

    const [user, serviceProvider] = await Promise.all([
      UserModel.findById((lead as any).userId),
      ServiceProviderRegModel.findById(providerId),
    ]);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (!serviceProvider) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Service provider not found" });
    }

    let purchasedItem: any;
    if (cartType === "service") {
      purchasedItem = await ServiceModel.findById(subscribedToId);
    } else if (cartType === "portfolio") {
      purchasedItem = await Portfolio.findById(subscribedToId);
    } else if (cartType === "package") {
      purchasedItem =
        await PackageModel.findById(subscribedToId).populate(
          "includedServices",
        );
    }

    if (!purchasedItem) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: `${cartType} not found` });
    }

    /* ---------------- FALLBACK PRICING FROM PURCHASED ITEM ----------------
       Legacy e-sign sessions may have no cartItem metadata. Fall back to the
       item's own fields so we can still compute subtotal/validity/gst/total. */
    if (subtotal === null) {
      if (cartType === "portfolio") {
        const plan = purchasedItem.pricingPlans?.[0];
        subtotal =
          typeof plan?.price === "number"
            ? plan.price
            : typeof purchasedItem.fees === "number"
            ? purchasedItem.fees
            : null;
      } else if (cartType === "service") {
        const plan = purchasedItem.pricingPlans?.[0];
        subtotal =
          typeof plan?.price === "number"
            ? plan.price
            : typeof purchasedItem.price === "number"
            ? purchasedItem.price
            : null;
      } else if (cartType === "package") {
        const plan = purchasedItem.pricingPlans?.[0];
        subtotal = typeof plan?.price === "number" ? plan.price : null;
      }
    }
    if (!validity) {
      if (cartType === "portfolio") {
        const plan = purchasedItem.pricingPlans?.[0];
        validity = plan?.validity ?? purchasedItem.feeValidity;
      } else if (cartType === "service") {
        const plan = purchasedItem.pricingPlans?.[0];
        validity = plan?.validity ?? purchasedItem.validity;
      } else if (cartType === "package") {
        const plan = purchasedItem.pricingPlans?.[0];
        validity = plan?.validity;
      }
    }
    const spChargesGst = Boolean((serviceProvider as any).gst);
    if (subtotal !== null) {
      if (!gst) {
        gst = spChargesGst ? Number((subtotal * 0.18).toFixed(2)) : 0;
      }
      if (total === null) {
        total = Number((subtotal + gst).toFixed(2));
      }
    }

    if (subtotal === null || total === null || !validity) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message:
          "Subtotal, total, and validity are required — fill them in the dialog.",
      });
    }

    /* ---------------- COUPON (optional) ----------------
       Re-validate server-side using the same helper the customer-side
       /api/services/applycoupon endpoint uses, so an SP can't bypass
       expiry / usage / targeting by handcrafting a request. Discount is
       applied to subtotal, then GST/total are recomputed to match the
       customer-checkout formula at StepTwo.tsx:74-76. */
    let couponSnapshot:
      | { id: string; code: string; type: string; value: number }
      | undefined;
    let discountAmount: number = 0;

    if (couponCode) {
      const validityForCoupon =
        typeof validity === "number"
          ? validity
          : Number.parseInt(String(validity), 10) || undefined;

      const couponResult = await validateCoupon({
        couponCode,
        serviceId: subscribedToId,
        price: subtotal,
        validity: validityForCoupon,
      });

      if (!couponResult.ok) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(couponResult.status)
          .json({ success: false, message: couponResult.message });
      }

      discountAmount = Number(couponResult.discountAmount.toFixed(2));
      subtotal = Number(couponResult.discountedPrice.toFixed(2));
      gst = spChargesGst ? Number((subtotal * 0.18).toFixed(2)) : 0;
      total = Number((subtotal + gst).toFixed(2));
      couponSnapshot = {
        id: couponResult.coupon.id,
        code: couponResult.coupon.code,
        type: couponResult.coupon.type,
        value: couponResult.coupon.value,
      };
    }

    const orderByName: string = user.name ?? "";
    const orderById: string = String(user._id);
    const orderByEmail: string = user.email ?? "";
    // RegName is the canonical SP display name used everywhere else in this
    // file (e.g. PaymentController.ts:1038, 7389). The optional `name` field is
    // frequently empty, so falling back to it alone left soldBy.name = "" and
    // tripped the order schema's `required` validator on conversion.
    const finalSoldByName: string =
      soldByName ||
      serviceProvider.RegName ||
      serviceProvider.name ||
      serviceProvider.companyName ||
      "";

    /* ---------------- ON-DEMAND ONBOARDING-CHARGE DEBIT ----------------
       Platform commission still applies on every conversion, even when no
       e-sign session exists — we synthesize a tracing id keyed on the lead
       so debitOnboardingCharge can still run. If the session is present
       and already debited, we skip (idempotent). */
    if (!esignSession?.chargeDebited) {
      const debitClientId =
        esignSession?.clientId ?? `manual_convert_${leadId}`;
      const debitResult = await debitOnboardingCharge({
        soldById: String(soldById),
        orderById,
        subscribedToId,
        subtotal,
        serviceName,
        orderByName,
        orderByEmail,
        esignClientId: debitClientId,
        session,
      });

      if (!debitResult.ok) {
        await session.abortTransaction();
        session.endSession();
        if (debitResult.reason === "insufficient-balance") {
          return res.status(403).json({
            success: false,
            code: "SP_INSUFFICIENT_WALLET",
            message:
              "Insufficient wallet balance to cover the onboarding charge. Please top up and retry.",
            amount: debitResult.amount,
          });
        }
        return res.status(400).json({
          success: false,
          code: "SP_NO_SUBSCRIPTION",
          message:
            "No active Tradebox subscription plan configured. Please contact admin.",
        });
      }

      // Only patch the e-sign session if one actually exists. For
      // synthesized debits we just track the transaction id locally so the
      // wallet-transaction link below still wires correctly.
      if (esignSession?._id) {
        await EsignSessionModel.updateOne(
          { _id: esignSession._id },
          {
            chargeDebited: true,
            chargeDebitedAt: new Date(),
            chargeAmount: debitResult.amount,
            walletTransactionId: debitResult.transactionId,
          },
          { session },
        );
      }
      esignWalletTransactionId = debitResult.transactionId;
    }

    /* ---------------- RENEWAL AUTO-DETECTION ----------------
       Mirrors gateway path at PaymentController.ts:2244. If the user has a
       prior order from this SP for this same item, this is a renewal —
       extend the prior endDate (preserving remaining days if still valid)
       and copy over kycDetails since we don't have aadhaarUrl/panUrl on
       EsignSession. */
    const previousOrder = await OrderModel.findOne({
      "orderdBy.id": orderById,
      subscribedToId,
      "soldBy.id": String(providerId),
    })
      .sort({ createdAt: -1 })
      .session(session);

    const isRenewal = !!previousOrder;
    let extendedEndDate: Date | null = null;

    if (previousOrder) {
      const today = new Date();
      const previousEndDate = new Date(previousOrder.endDate || today);
      const baseDate = previousEndDate > today ? previousEndDate : today;
      const newEnd = new Date(baseDate);

      if (cartType === "portfolio") {
        const validityMatch = String(validity).match(/(\d+)\s*(month|year)/i);
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

    /* ---------------- TELEGRAM INVITE LINKS ----------------
       Mirrors gateway path at PaymentController.ts:2316. */
    let telegramInviteLink: string | null = null;
    const telegramInviteLinks: { serviceName: string; link: string }[] = [];
    const userTelegramId = (user as any).telegramUserId;

    try {
      if (cartType === "service" && purchasedItem.telegramChannelId) {
        let skipInviteLink = false;
        if (isRenewal && userTelegramId) {
          skipInviteLink = await isUserInChannel(
            purchasedItem.telegramChannelId,
            userTelegramId,
          );
        }
        if (!skipInviteLink) {
          const invite = await getChannelInviteLink(
            purchasedItem.telegramChannelId,
            "pending",
            subscribedToId,
            orderById,
          );
          if (invite?.link) telegramInviteLink = invite.link;
        }
      } else if (
        cartType === "portfolio" &&
        purchasedItem.telegramChannelId
      ) {
        let skipInviteLink = false;
        if (isRenewal && userTelegramId) {
          skipInviteLink = await isUserInChannel(
            purchasedItem.telegramChannelId,
            userTelegramId,
          );
        }
        if (!skipInviteLink) {
          const invite = await getChannelInviteLink(
            purchasedItem.telegramChannelId,
            "pending",
            subscribedToId,
            orderById,
          );
          if (invite?.link) telegramInviteLink = invite.link;
        }
      } else if (cartType === "package") {
        for (const svc of purchasedItem.includedServices || []) {
          if (!svc.telegramChannelId) continue;
          let skipInviteLink = false;
          if (isRenewal && userTelegramId) {
            skipInviteLink = await isUserInChannel(
              svc.telegramChannelId,
              userTelegramId,
            );
          }
          if (!skipInviteLink) {
            const invite = await getChannelInviteLink(
              svc.telegramChannelId,
              "pending",
              subscribedToId,
              orderById,
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
    } catch (telegramErr) {
      console.error(
        "[convertLeadToSubscriber] telegram invite generation failed:",
        telegramErr,
      );
    }

    /* ---------------- ORDER DATES ----------------
       Mirrors gateway path at PaymentController.ts:2383. */
    const orderEndDate = new Date();
    if (cartType === "portfolio") {
      const validityMatch = String(validity).match(/(\d+)\s*(month|year)/i);
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

    /* ---------------- CREATE ORDER ---------------- */
    const order = await new OrderModel({
      subscribedToId,
      serviceName,
      orderdBy: { name: orderByName, id: orderById, email: orderByEmail },
      soldBy: { name: finalSoldByName, id: String(providerId) },
      paymentId: syntheticPaymentId,
      subtotal,
      gst,
      total,
      paymentMethod: "Manual-Converted",
      validity,
      type: cartType,
      // Precedence: SP upload → e-sign signed PDF → undefined. The schema
      // already allows it to be missing.
      signedDocumentUrl:
        manualSignedDocUrl ?? esignSession?.signedDocURL ?? undefined,
      verifiedByRa: true,
      paymentStatus: "verified",
      kycDetails: {
        // Each field falls back: SP-typed → previous order (renewal) →
        // whatever exists on the User record. All are optional per schema.
        aadhaarUrl:
          manualKyc.aadhaarUrl ?? previousOrder?.kycDetails?.aadhaarUrl,
        panUrl: manualKyc.panUrl ?? previousOrder?.kycDetails?.panUrl,
        panNumber: manualKyc.panNumber ?? (user as any).pannumber,
        dob: manualKyc.dob ?? (user as any).dob,
      },
      isRenewal,
      previousOrderId: previousOrder?._id ?? null,
      startDate: new Date(),
      endDate: isRenewal && extendedEndDate ? extendedEndDate : orderEndDate,
      telegramInviteLink,
      telegramInviteLinks,
      coupon: couponSnapshot,
      discountAmount,
      conversionNote: note || undefined,
    }).save({ session });

    /* ---------------- COUPON USAGE INCREMENT ----------
       Same atomic redemption guard as the gateway paths. couponSnapshot is
       only set when validateCoupon succeeded earlier in this handler. */
    if (couponSnapshot?.id) {
      const redeem = await redeemCoupon(couponSnapshot.id, session);
      if (!redeem.ok) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ success: false, message: redeem.message });
      }
    }

    /* ---------------- WALLET TRANSACTION PATCH ----------------
       The onboarding charge was debited at e-sign completion; link that
       existing transaction to the new order. Exact same patch the gateway
       flow does at PaymentController.ts:2546. */
    if (esignWalletTransactionId) {
      await WalletTransactionModel.updateOne(
        { _id: esignWalletTransactionId },
        {
          orderId: order._id.toString(),
          paymentId: syntheticPaymentId,
        },
        { session },
      );
    }

    /* ---------------- DELETE LEAD ---------------- */
    await LeadModel.findByIdAndDelete(leadId, { session });

    /* ---------------- SUBSCRIBE USER ----------------
       Mirrors gateway path at PaymentController.ts:2497. */
    await UserModel.findByIdAndUpdate(
      orderById,
      {
        $addToSet: {
          "ServicesAndOrders.orders": order._id,
          "ServicesAndOrders.services": subscribedToId,
        },
      },
      { session },
    );

    if (cartType === "service") {
      await ServiceModel.findByIdAndUpdate(
        subscribedToId,
        { $addToSet: { subscribedBy: orderById } },
        { session },
      );
    } else if (cartType === "portfolio") {
      await Portfolio.findByIdAndUpdate(
        subscribedToId,
        { $addToSet: { subscribedBy: orderById } },
        { session },
      );
    } else if (cartType === "package") {
      const includedServiceIds = (purchasedItem.includedServices || [])
        .map((svc: any) => svc?._id)
        .filter(Boolean);

      await Promise.all(
        includedServiceIds.map((svcId: any) =>
          ServiceModel.findByIdAndUpdate(
            svcId,
            { $addToSet: { subscribedBy: orderById } },
            { session },
          ),
        ),
      );

      // Package buyers should see each included plan in their "Subscribed
      // Services" page. The combined UserModel update above only pushed the
      // package id (which doesn't match any ServiceModel doc) — also push
      // every included service id so getSubscribedServices' aggregation
      // finds them. Mirrors createAndVerifyOrder at PaymentController.ts:2579.
      if (includedServiceIds.length > 0) {
        await UserModel.findByIdAndUpdate(
          orderById,
          { $addToSet: { "ServicesAndOrders.services": { $each: includedServiceIds } } },
          { session },
        );
      }
    }

    /* ---------------- EMAIL HTML ----------------
       Same template the gateway path uses at PaymentController.ts:2613. */
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
        </div>`,
        )
        .join("");
    }

    await session.commitTransaction();

    /* ---------------- CONFIRMATION EMAIL ---------------- */
    try {
      await mailQueue.add(
        user.email!,
        {
          mailOptions: {
            from: process.env.EMAIL,
            to: user.email,
            cc: serviceProvider.email,
            subject: isRenewal
              ? `Renewal Confirmation for ${serviceName}`
              : `Confirmation for ${serviceName} purchase`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 0 20px;"> <p style="font-size: 16px; color: #333; margin-bottom: 20px;">We thank you for choosing the services, kindly download your e-sign documents and join the channel for all the updates by clicking the link given below.</p> <h2 style="text-align: left;">${isRenewal ? 'Renewal Confirmation' : 'Order Confirmation'}</h2> <div style="padding: 10px 0;"> <h4 style="padding-bottom: 5px;">Purchased by:</h4> <h5>Name: <span>${user.name}</span></h5> <h5>Email: <span>${user.email}</span></h5> <h5>Purchase Date: <span>${new Date(order.createdAt).toLocaleDateString("en-IN")}</span></h5> </div> <table style="width: 100%; border-collapse: collapse; margin-top: 20px;"> <tr> <td style="padding: 10px; border: 1px solid #ddd;">Plan Name</td> <td style="padding: 10px; border: 1px solid #ddd;">${serviceName}</td> </tr> <tr> <td style="padding: 10px; border: 1px solid #ddd;">Price</td> <td style="padding: 10px; border: 1px solid #ddd;">₹${subtotal}</td> </tr> <tr> <td style="padding: 10px; border: 1px solid #ddd;">GST (18%)</td> <td style="padding: 10px; border: 1px solid #ddd;">₹${gst}</td> </tr> <tr> <td style="padding: 10px; border: 1px solid #ddd;">Total Amount</td> <td style="padding: 10px; border: 1px solid #ddd;">₹${total}</td> </tr> </table> ${telegramHtml} <div style="text-align: center; margin: 20px 0;"> <p style="margin-bottom: 15px; font-size: 16px;">Your signed document:</p> <a href="${order.signedDocumentUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 16px;"> View Signed Document </a> </div> <p style="margin-top: 20px; font-size: 14px; color: #555;"> Note: All prices are inclusive of GST. Please save this email for future reference. </p> </div>
            `,
          },
        },
        { removeOnComplete: false, removeOnFail: false },
      );
    } catch (mailErr) {
      console.error(
        "[convertLeadToSubscriber] mail queue failed for order:",
        order._id,
        mailErr,
      );
    }

    /* ---------------- INVOICE QUEUE ----------------
       Same payload shape as the gateway path at PaymentController.ts:2665. */
    try {
      await InvoiceQueueService.add(
        "invoice-queue-service",
        {
          orderId: order._id.toString(),
          userType: "user",

          serviceId: subscribedToId,
          serviceName,

          serviceProviderName: finalSoldByName,
          serviceProviderId: String(providerId),
          serviceprovideremail: serviceProvider.email,
          serviceProviderAddress: [serviceProvider.city, serviceProvider.state]
            .filter(Boolean)
            .join(", "),
          serviceProviderRegistrationNumber: (serviceProvider as any).regNumber,
          serviceProviderWebsite: (serviceProvider as any).website,
          serviceProviderGST: serviceProvider.gst ? serviceProvider.gst : "",
          serviceProviderHSN: (serviceProvider as any).hsnCode
            ? (serviceProvider as any).hsnCode
            : "",
          serviceProviderPhone: (serviceProvider as any).number,
          serviceProviderState: serviceProvider.state,

          buyerId: orderById,
          buyerName: user.name,
          buyerNumber: (user as any).number,
          buyerEmail: user.email,
          buyerPan: (user as any).pannumber ? (user as any).pannumber : "",

          subtotal,
          gst,
          total,
          discountAmount: discountAmount ?? 0,
          couponCode: couponSnapshot?.code ?? undefined,
          validity: /^\d+$/.test(String(validity).trim())
            ? `${validity} days`
            : validity,

          issueDate: order.createdAt,
          serviceStartDate: order.startDate,
          serviceEndDate: order.endDate,
        },
        {
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
    } catch (invoiceErr) {
      console.error(
        "[convertLeadToSubscriber] invoice queue failed for order:",
        order._id,
        invoiceErr,
      );
    }

    return res.status(201).json({
      success: true,
      message: "Lead converted to subscriber",
      order,
    });
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch {}
    console.error("convertLeadToSubscriber error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  } finally {
    session.endSession();
  }
};

// GET /api/serviceprovider/features?id=SP_ID

export const getSPPaymentDetails = async (req: Request, res: Response) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Service provider ID is required",
    });
  }

  try {
    const sp = await ServiceProviderRegModel.findById(id).lean();
    if (!sp) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    const enabledServices = sp.services || {};
    const responsePayload: any = { services: enabledServices };

    if (enabledServices.paymentGateway) {
      const integration = (enabledServices as any).integration || "razorpay";
      responsePayload.integration = integration;

      if (integration === "cashfree" && sp.cashfreeKey) {
        const cashfreeKeys = await CashfreeKeyModel.findOne({
          userId: id,
        }).lean();
        if (cashfreeKeys) {
          responsePayload.cashfree = {
            app_id: cashfreeKeys.appId,
          };
        }
      } else if (sp.razorpayKey) {
        const razorpayKeys = await RazorpayKeyModel.findOne({
          userId: id,
        }).lean();
        if (razorpayKeys) {
          responsePayload.razorpay = {
            key_id: razorpayKeys.keyId,
            key_secret: razorpayKeys.keySecret,
          };
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: responsePayload,
    });
  } catch (error) {
    console.error("Error fetching features:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const createOrderAndVerify = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ✅ Parse JSON + file
    let parsedData;
    try {
      parsedData = JSON.parse(req.body.data);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Invalid JSON data" });
    }

    const {
      subscribedToId,
      serviceName,
      orderByName,
      orderById,
      orderByEmail,
      soldByName,
      soldById,
      subtotal,
      gst,
      total,
      validity,
      signedDocumentUrl,
      aadhaarUrl,
      panUrl,
      panNumber,
      dob,
    } = parsedData;

    const esignReject = await assertMatchedEsignOrReject(
      String(orderById),
      String(subscribedToId)
    );
    if (esignReject) {
      await session.abortTransaction();
      session.endSession();
      return res.status(esignReject.status).json(esignReject.body);
    }

    const order = new OrderModel({
      subscribedToId,
      serviceName,
      orderdBy: { name: orderByName, id: orderById, email: orderByEmail },
      soldBy: { name: soldByName, id: soldById },
      paymentId: req.body.paymentId || "Manual", // Optional for Razorpay
      subtotal,
      gst,
      total,
      paymentMethod: "Razorpay",
      validity,
      invoiceLink: "",
      isExpired: false,
      remainder: 0,
      type: "service",
      signedDocumentUrl,
      verifiedByRa: true,
      kycDetails: { aadhaarUrl, panUrl, panNumber, dob },
      startDate: new Date(),
    });

    const daysMatch = validity?.match(/\d+/);
    const daysToAdd = daysMatch ? parseInt(daysMatch[0], 10) : 0;
    if (daysToAdd) {
      const endDate = new Date(order.startDate!);
      endDate.setDate(endDate.getDate() + daysToAdd);
      order.endDate = endDate;
    }

    await order.save({ session });

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

    await new notificationModel({
      message: order.isRenewal
        ? `${order.orderdBy?.name} has renewed your plan ${order.serviceName}`
        : `${order.orderdBy?.name} has purchased your plan ${order.serviceName}`,
      sendTo: [{ id: order.soldBy?.id, name: order.soldBy?.name }],
      sentBy: { id: order.orderdBy?.id, name: order.orderdBy?.name },
      type: "service",
    }).save({ session });

    const serviceProvider = await ServiceProviderRegModel.findById(
      soldById
    ).session(session);
    if (!serviceProvider) throw new Error("Service provider not found");

    const subscription = await TradeboxPlansModel.findById(
      serviceProvider.subscriptionDetails?.currentSubscription
    ).session(session);
    if (!subscription) throw new Error("No active subscription for provider");

    const isNewCustomer = !serviceProvider.ServicesAndOrders?.orders?.some(
      (oid) => oid.toString() === order.orderdBy?.id.toString()
    );

    let amountToBeDeducted = 0;
    const currentCustomerCount =
      serviceProvider.ServicesAndOrders?.orders?.length || 0;

    if (subscription.plan === "Prepaid") {
      const limit = subscription.customerLimit || 0;
      if (currentCustomerCount >= limit) {
        amountToBeDeducted += subscription.renewalCharge || 0;
      } else if (isNewCustomer) {
        amountToBeDeducted += subscription.freshOnboardingCharge || 0;
      }
      await subscription.updateOne(
        { currentCustomerCount: currentCustomerCount + 1 },
        { session }
      );
    } else {
      const baseAmount = order.subtotal;
      if (subscription.pricingType === "Percentage") {
        const percentage = isNewCustomer
          ? subscription.percentageFreshOnboarding ?? 0
          : subscription.percentageRenewal ?? 0;

        amountToBeDeducted += ((baseAmount || 0) * percentage) / 100;
      } else {
        amountToBeDeducted += isNewCustomer
          ? subscription.fixedFreshOnboardingCharge ?? 0
          : subscription.fixedRenewalCharge ?? 0;
      }
    }

    amountToBeDeducted *= 1.18;
    if (serviceProvider.wallet.amount < amountToBeDeducted)
      throw new Error("Insufficient wallet balance");

    serviceProvider.wallet.amount -= amountToBeDeducted;
    await serviceProvider.save({ session });
    await notifyWalletChange({
      spId: String(serviceProvider._id),
      spName: serviceProvider.RegName,
      amount: amountToBeDeducted,
      direction: "debit",
      reason: order.isRenewal
        ? `renewal commission for ${order.serviceName}`
        : `onboarding commission for ${order.serviceName}`,
      newBalance: serviceProvider.wallet.amount,
      session,
    });

    await WalletTransactionModel.create(
      [
        {
          serviceProviderId: serviceProvider._id,
          orderdBy: {
            name: order.orderdBy?.name,
            id: order.orderdBy?.id,
            email: order.orderdBy?.email,
          },
          paymentId: order.paymentId || "N/A",
          orderId: order._id,
          amount: amountToBeDeducted,
          type: "Onboarding-Charge",
        },
      ],
      { session }
    );

    const service = await ServiceModel.findById(order.subscribedToId).session(
      session
    );
    if (!service) throw new Error("Service not found");

    await ServiceModel.findByIdAndUpdate(order.subscribedToId, {
      $addToSet: {
        subscribedBy: order.orderdBy?.id,
      },
    }).session(session);

    /* ---------------- DELETE LEAD ---------------- */
    await LeadModel.findOneAndDelete(
      {
        userId: order.orderdBy?.id,
        serviceId: order.subscribedToId,
        providerId: order.soldBy?.id,
      },
      { session }
    );

    const inviteLink = await getChannelInviteLink(
      service.telegramChannelId!,
      order?._id.toString(),
      order?.subscribedToId,
      order?.orderdBy?.id!
    );
    if (!inviteLink) throw new Error("Failed to get Telegram invite link");

    const serviceTaker = await UserModel.findById(order.orderdBy?.id).session(
      session
    );
    const hasGST = !!serviceProvider.gst;

    await InvoiceQueueService.add(
      order._id.toString(),
      {
        orderId: order._id,
        buyerId: order.orderdBy?.id,
        serviceName: order.serviceName,
        serviceId: order.subscribedToId,
        serviceProviderName: order.soldBy?.name,
        serviceProviderId: order.soldBy?.id,
        spaddress1: serviceProvider.address1,
        spaddress2: serviceProvider.address2,
        spcity: serviceProvider.city,
        spstate: serviceProvider.state,
        sebiRegNumber: serviceProvider.regNumber,
        buyerName: serviceTaker?.name,
        issueDate: new Date(order.createdAt).toLocaleDateString("en-IN"),
        subtotal: order.subtotal,
        gst: order.gst,
        total: order.total,
        discountAmount: order.discountAmount ?? 0,
        couponCode: (order.coupon as any)?.code ?? undefined,
        userType: "user",
        validity: order.validity.split(",")[0],
        inviteLink,
        hasGST,
      },
      { removeOnComplete: true, removeOnFail: true }
    );

    await session.commitTransaction();
    session.endSession();

    const website = serviceProvider?.website || "/";
    return res.status(201).json({
      success: true,
      message: "Order created & verified",
      order,
      website,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Order+Verify Error:", error);
    return res
      .status(500)
      .json({ success: false, message: error || "Server error" });
  }
};

// export const purchaseSubscription = async (req: Request, res: Response) => {
//   try {
//     const { userId, plan, validity, price, gst, total } = req.body;

//     // Fetch service provider by userId
//     const serviceProvider = await ServiceProviderRegModel.findOne({
//       _id: userId,
//     });

//     if (!serviceProvider) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Service provider not found." });
//     }

//     // Check wallet balance
//     const walletBalance = serviceProvider.wallet.amount || 0;
//     if (walletBalance < total) {
//       return res.status(400).json({
//         success: false,
//         message: "Insufficient wallet balance.",
//         description:
//           "Please recharge your wallet balance to purchase the subscription",
//       });
//     }

//     // Deduct balance from wallet
//     serviceProvider.wallet.amount -= total;

//     // Calculate Subscription End Date
//     const startDate = new Date();
//     const endDate = new Date();
//     endDate.setMonth(endDate.getMonth() + validity);

//     serviceProvider.subscriptionDetails = {
//       plan,
//       validity,
//       price,
//       gst,
//       total,
//       startDate,
//       endDate,
//       status: "active",
//     };

//     // Save changes to database
//     await serviceProvider.save();

//     let order = new TradeboxPlansModel({
//       orderdBy: {
//         name: serviceProvider.RegName,
//         id: serviceProvider._id,
//         email: serviceProvider.email,
//       },
//       paymentId: "",
//       orderId: "",
//       amount: total,
//       paymentMethod: "Wallet",
//       planName: plan,
//       validity: endDate,
//       duration: validity,
//     });

//     await order.save();

//     await new notificationModel({
//       message: `${order.orderdBy?.name} has subscribed to ${order.planName}`,
//       sendTo: [{ id: "admin", name: "Tradebox Admin" }],
//       sentBy: { id: order.orderdBy?.id, name: order.orderdBy?.name },
//       type: "membership",
//     }).save();

//     await new notificationModel({
//       message: `Your Tradebox membership is now active!`,
//       sendTo: [{ id: order.orderdBy?.id, name: order.orderdBy?.name }],
//       sentBy: { id: "admin", name: "admin" },
//       type: "membership",
//     }).save();

//     await InvoiceQueueTradeboxPlans.add(
//       order._id.toString(),
//       {
//         orderId: order._id,
//         buyerId: order.orderdBy?.id,
//         tradeBoxPlanName: plan,
//         serviceId: "NA",
//         RegName: serviceProvider.RegName,
//         issueDate: order.createdAt,
//         price: price,
//         gst: gst,
//         total: total,
//         paymentID: "NA",
//         userType: "sp",
//         validity: validity,
//         endDate: endDate,
//       },
//       { removeOnComplete: true, removeOnFail: true }
//     );

//     return res.status(200).json({
//       success: true,
//       message: "Subscription purchased successfully.",
//       subscriptionDetails: serviceProvider.subscriptionDetails,
//     });
//   } catch (error) {
//     console.error("Error purchasing subscription:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal Server Error" });
//   }
// };

export const subscriptionDetails = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    // Find the service provider by userId
    const serviceProvider = await ServiceProviderRegModel.findById(userId);

    if (!serviceProvider || !serviceProvider.subscriptionDetails) {
      return res.json({
        success: false,
        isActive: false,
        message: "No active subscription found",
      });
    }

    const subscription = serviceProvider.subscriptionDetails;

    // Ensure subscription contains required fields
    if (subscription.subscriptionActive == false) {
      return res.json({
        success: false,
        isActive: false,
        message: "No subscription data found",
      });
    }

    const subscriptionId = subscription?.currentSubscription;

    const currSubscriptionDetails = await TradeboxPlansModel.findById(
      subscriptionId
    );

    if (currSubscriptionDetails) {
      return res.json({
        success: true,
        isActive: true,
        subscriptionDetails: currSubscriptionDetails,
      });
    }

    return res.json({
      success: false,
      isActive: false,
      message: "Inactive subscription",
    });
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

export const rejectPurchase = async (req: Request, res: Response) => {
  const { id, reason } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, message: "Missing ID" });
  }

  if (!reason) {
    return res.status(400).json({ success: false, message: "Missing reason" });
  }

  try {
    const orderData = await OrderModel.findById(id);
    // console.log(orderData)
    if (!orderData) {
      return res
        .status(400)
        .json({ success: false, message: "order data not found" });
    }

    const email = orderData?.orderdBy?.email;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "User email not found" });
    }

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: `Hello ${orderData?.orderdBy?.name},`,
      html: `<p>We regret to inform you that your recent plan purchase could not be verified due to the following reason:</p> <br /> <p> ${reason} </p> <p>Please review the issue mentioned above and make the necessary corrections. Once updated, you are welcome to reapply for the plan.</p>
  <br />
  <p>If you believe this was a mistake or need assistance, feel free to reach out to our support team.</p>
  <br /> <br /> Best regards,    <br /> <br /> Trade Box Fintech Solutions `,
    };

    await mailQueue.add(
      email,
      { mailOptions },
      { removeOnComplete: true, removeOnFail: true }
    );

    // Delete the order from the database
    await orderData.deleteOne();

    return res
      .status(200)
      .json({ success: true, message: "Purchase rejected and order deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Error rejecting purchase", error });
  }
};

/**
 * POST /api/payment/createandenroll
 * Expects Razorpay webhook payload in req.body OR expects the same shape:
 * {
 *   payload: {
 *     payment: {
 *       entity: { ...razorpayPaymentEntity }
 *     }
 *   }
 * }
 *
 * The controller:
 *  - verifies signature against RAZORPAY_WEBHOOK_SECRET
 *  - extracts fetchedOrder = req.body.payload.payment.entity
 *  - uses fetchedOrder.notes to get buyerId and any orderId
 *  - creates CourseOrder (idempotent by razorpay_payment_id)
 *  - creates or updates Enrollment for buyer+course
 */
export const createAndEnroll = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const body = req.body || {};

    const {
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      courseId,
      orderById,
      orderByName,
      orderByEmail,
      soldById,
      soldByName,
      subtotal,
      gst,
      total,
      currency = "INR",
      status = "captured",
    } = body;

    if (!orderById || !courseId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing buyerId or courseId" });
    }

    const toObjectIdIfPossible = (val: any) => {
      if (!val) return val;
      if (val instanceof mongoose.Types.ObjectId) return val;
      if (typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val)) {
        return new mongoose.Types.ObjectId(val);
      }
      return val;
    };

    const buyerObjectId = toObjectIdIfPossible(orderById);
    const courseObjectId = toObjectIdIfPossible(courseId);

    /**
     * 🔁 Idempotency
     */
    if (razorpayPaymentId) {
      const existing = await CourseOrderModel.findOne({ razorpayPaymentId });
      if (existing) {
        const enrollmentExists = await EnrollmentModel.findOne({
          userId: buyerObjectId,
          courseId: courseObjectId,
        });

        if (!enrollmentExists) {
          const enroll = await EnrollmentModel.create({
            userId: buyerObjectId,
            courseId: courseObjectId,
            orderRef: existing._id,
            enrolledAt: new Date(),
            status: "active",
          });

          await UserModel.findByIdAndUpdate(buyerObjectId, {
            $addToSet: { enrolledCourses: courseObjectId },
          });

          return res.json({
            success: true,
            message: "Existing order found — enrollment created",
            orderId: existing._id,
            enrollmentId: enroll._id,
          });
        }

        return res.json({
          success: true,
          message: "Order already processed",
          orderId: existing._id,
        });
      }
    }

    /**
     * 🔎 Validate Buyer & Course
     */
    const [buyerDoc, courseDoc] = await Promise.all([
      UserModel.findById(buyerObjectId).lean(),
      CourseModel.findById(courseObjectId).populate("instructorId"),
    ]);

    if (!buyerDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Buyer not found" });
    }

    if (!courseDoc || !courseDoc.instructorId) {
      return res
        .status(404)
        .json({ success: false, message: "Course or instructor not found" });
    }

    const instructor: any = courseDoc.instructorId;

    /**
     * 💰 LMS COMMERCIAL SPLIT
     */
    const commissionPercentage =
      instructor?.lmsCommercial?.enabled === true
        ? Number(instructor.lmsCommercial.commissionPercentage || 0)
        : 0;

    const GST_RATE = 0.18;

    const tradeboxSubtotal = Math.round(
      subtotal * (commissionPercentage / 100)
    );
    const raSubtotal = subtotal - tradeboxSubtotal;

    const tradeboxGST = Math.round(tradeboxSubtotal * GST_RATE);
    const raGST = Math.round(raSubtotal * GST_RATE);

    const tradeboxTotal = tradeboxSubtotal + tradeboxGST;
    const raTotal = raSubtotal + raGST;

    /**
     * 🧾 Create Course Order (with bifurcation)
     */
    const courseOrder = await CourseOrderModel.create(
      [
        {
          orderId: razorpayOrderId || `order_${Date.now()}`,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,

          buyerId: buyerObjectId,
          courseId: courseObjectId,

          subtotal,
          gst,
          total,
          currency,

          revenueBreakdown: {
            commissionPercentage,
            ra: {
              subtotal: raSubtotal,
              gst: raGST,
              total: raTotal,
            },
            tradebox: {
              subtotal: tradeboxSubtotal,
              gst: tradeboxGST,
              total: tradeboxTotal,
            },
          },

          status: status === "captured" ? "paid" : status,
        },
      ],
      { session }
    );

    /**
     * 💳 Credit RA Wallet
     */
    await ServiceProviderRegModel.findByIdAndUpdate(
      instructor._id,
      {
        $inc: {
          "wallet.amount": raTotal,
        },
      },
      { session }
    );

    /**
     * 📘 Wallet Ledger Entry
     */
    await WalletTransactionModel.create(
      [
        {
          serviceProviderId: instructor._id,
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          orderdBy: {
            name: orderByName,
            id: orderById,
            email: orderByEmail,
          },
          type: "course-sale",
          amount: raTotal,
          meta: {
            courseId: courseObjectId,
            orderId: courseOrder[0]._id,
            commissionPercentage,
          },
        },
      ],
      { session }
    );

    /**
     * 🎓 Enrollment
     */
    let enrollment = await EnrollmentModel.findOne({
      userId: buyerObjectId,
      courseId: courseObjectId,
    });

    if (!enrollment) {
      enrollment = await EnrollmentModel.create({
        userId: buyerObjectId,
        courseId: courseObjectId,
        orderRef: courseOrder[0]._id,
        enrolledAt: new Date(),
        status: "active",
      });
    } else {
      enrollment.orderRef = courseOrder[0]._id;
      enrollment.status = "active";
      enrollment.enrolledAt = new Date();
      await enrollment.save();
    }

    await UserModel.findByIdAndUpdate(buyerObjectId, {
      $addToSet: { enrolledCourses: courseObjectId },
    });

    /**
     * 📧 ORDER CONFIRMATION MAIL (Udemy-style)
     */
    try {
      const purchaseDate = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      const courseUrl = `${process.env.NEXTAUTH_URL}/view/courses/${courseDoc._id}`;

      const mailOptions = {
        from: process.env.EMAIL,
        to: buyerDoc.email,
        cc: instructor.email,
        subject: `Order Confirmation – ${courseDoc.title}`,
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #222;">
        
        <h2>🎉 Course Purchase Confirmed</h2>
        <p>Thank you for purchasing <strong>${courseDoc.title}</strong>.</p>

        <a href="${courseUrl}"
          style="
            display: inline-block;
            margin: 20px 0;
            padding: 12px 24px;
            background-color: #22c55e;
            color: #fff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
          ">
          Go to Course
        </a>

        <hr style="margin: 24px 0;" />

        <h3>📌 Purchased By</h3>
        <p>
          <strong>Name:</strong> ${buyerDoc.name || "User"} <br/>
          <strong>Email:</strong> ${buyerDoc.email} <br/>
          <strong>Date:</strong> ${purchaseDate}
        </p>

        <h3>🧑‍🏫 Sold By</h3>
        <p>
          <strong>Name:</strong> ${instructor.RegName} <br/>
          <strong>Email:</strong> ${instructor.email}
        </p>

        <h3>🧾 Receipt Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Course</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${
              courseDoc.title
            }</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Price</td>
            <td style="padding: 8px; border: 1px solid #ddd;">₹${subtotal}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">GST (18%)</td>
            <td style="padding: 8px; border: 1px solid #ddd;">₹${gst}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">
              Total Paid
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">
              ₹${total}
            </td>
          </tr>
        </table>

        <div style="margin-top: 30px; padding: 20px; background-color: #111; border-radius: 8px;">
          <h3 style="color: #ffcc00; text-align: center;">Customer Support</h3>

          <p style="color: #fff; text-align: center; margin: 8px 0;">
            📞 <a href="tel:+917827531843" style="color:#fff;">+91 78275 31843</a>
          </p>

          <p style="color: #fff; text-align: center; margin: 8px 0;">
            📧 <a href="mailto:info@tradeboxlive.com" style="color:#fff;">
              info@tradeboxlive.com
            </a>
          </p>

          <p style="color:#bbb; font-size: 13px; text-align: center;">
            Mon–Sat, 9:00 AM – 6:00 PM
          </p>
        </div>

        <p style="margin-top: 20px; font-size: 13px; color: #666;">
          This is an automated email. Please keep it for your records.
        </p>

        <p style="font-size: 12px; color: #999; text-align: center;">
          © ${new Date().getFullYear()} TradeBox Fintech Solutions
        </p>
      </div>
    `,
      };

      await mailQueue.add(
        buyerDoc.email,
        { mailOptions },
        {
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      console.log("📧 Course purchase mail queued successfully");
    } catch (mailErr) {
      console.error("Mail queue error:", mailErr);
      // ❗ Do NOT fail purchase if mail fails
    }

    await session.commitTransaction();
    session.endSession();

    return res.json({
      success: true,
      message: "Order recorded, revenue split applied, user enrolled",
      orderId: courseOrder[0]._id,
      enrollmentId: enrollment._id,
    });
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();

    console.error("createAndEnroll error:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Internal server error",
    });
  }
};

// ─── Marketplace Course Enrollment with Broker Commission ────────────────────

export const createAndEnrollMarketplace = async (req: Request, res: Response) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const body = req.body || {};
    const {
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      cashfreePaymentId,
      cashfreeOrderId,
      courseId,
      orderById,
      orderByName,
      orderByEmail,
      soldById,
      soldByName,
      subtotal,
      gst,
      total,
      currency = "INR",
      status = "captured",
      marketplaceSlug,
    } = body;

    if (!orderById || !courseId || !marketplaceSlug) {
      return res.status(400).json({
        success: false,
        message: "Missing buyerId, courseId, or marketplaceSlug",
      });
    }

    const toObjectIdIfPossible = (val: any) => {
      if (!val) return val;
      if (val instanceof mongoose.Types.ObjectId) return val;
      if (typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val)) {
        return new mongoose.Types.ObjectId(val);
      }
      return val;
    };

    const buyerObjectId = toObjectIdIfPossible(orderById);
    const courseObjectId = toObjectIdIfPossible(courseId);

    // Idempotency check
    const paymentId = razorpayPaymentId || cashfreePaymentId;
    if (paymentId) {
      const existing = await CourseOrderModel.findOne({ razorpayPaymentId: paymentId });
      if (existing) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        return res.json({ success: true, message: "Order already processed", orderId: existing._id });
      }
    }

    // Validate buyer, course, marketplace, broker
    const [buyerDoc, courseDoc, marketplace] = await Promise.all([
      UserModel.findById(buyerObjectId).lean(),
      CourseModel.findById(courseObjectId).populate("instructorId"),
      MarketplaceModel.findOne({ slug: marketplaceSlug }).lean(),
    ]);

    if (!buyerDoc) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return res.status(404).json({ success: false, message: "Buyer not found" });
    }
    if (!courseDoc || !courseDoc.instructorId) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return res.status(404).json({ success: false, message: "Course or instructor not found" });
    }
    if (!marketplace) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return res.status(404).json({ success: false, message: "Marketplace not found" });
    }

    const broker = await ServiceProviderRegModel.findById(
      (marketplace as any).createdByBrokerId
    );
    if (!broker) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      return res.status(404).json({ success: false, message: "Broker not found" });
    }

    const instructor: any = courseDoc.instructorId;

    // LMS commercial split (same as createAndEnroll)
    const commissionPercentage =
      instructor?.lmsCommercial?.enabled === true
        ? Number(instructor.lmsCommercial.commissionPercentage || 0)
        : 0;

    const GST_RATE = 0.18;
    const tradeboxSubtotal = Math.round(subtotal * (commissionPercentage / 100));
    const raSubtotal = subtotal - tradeboxSubtotal;
    const tradeboxGST = Math.round(tradeboxSubtotal * GST_RATE);
    const raGST = Math.round(raSubtotal * GST_RATE);
    const tradeboxTotal = tradeboxSubtotal + tradeboxGST;
    const raTotal = raSubtotal + raGST;

    // Broker commission: 10% of subtotal + 18% GST
    const BROKER_COMMISSION_RATE = 10;
    const brokerCommissionAmount = Math.round((subtotal * BROKER_COMMISSION_RATE / 100) * 1.18);

    // Create course order with marketplace tagging
    const courseOrder = await CourseOrderModel.create(
      [{
        orderId: razorpayOrderId || cashfreeOrderId || `order_${Date.now()}`,
        razorpayOrderId: razorpayOrderId || cashfreeOrderId || `order_${Date.now()}`,
        razorpayPaymentId: paymentId || `pay_${Date.now()}`,
        razorpaySignature: razorpaySignature || "",
        buyerId: buyerObjectId,
        courseId: courseObjectId,
        subtotal,
        gst,
        total,
        currency,
        revenueBreakdown: {
          commissionPercentage,
          ra: { subtotal: raSubtotal, gst: raGST, total: raTotal },
          tradebox: { subtotal: tradeboxSubtotal, gst: tradeboxGST, total: tradeboxTotal },
        },
        marketplaceId: (marketplace as any)._id.toString(),
        brokerCommission: brokerCommissionAmount,
        status: status === "captured" ? "paid" : status,
      }],
      { session: dbSession }
    );

    // Credit RA wallet (course sale minus broker commission)
    const raNetCredit = raTotal - brokerCommissionAmount;
    await ServiceProviderRegModel.findByIdAndUpdate(
      instructor._id,
      { $inc: { "wallet.amount": raNetCredit } },
      { session: dbSession }
    );

    // Credit broker wallet
    await ServiceProviderRegModel.findByIdAndUpdate(
      broker._id,
      { $inc: { "wallet.amount": brokerCommissionAmount } },
      { session: dbSession }
    );

    // RA wallet transaction: course sale credit
    await WalletTransactionModel.create(
      [{
        serviceProviderId: instructor._id,
        orderId: courseOrder[0]._id.toString(),
        paymentId: paymentId || "marketplace",
        orderdBy: { name: orderByName, id: orderById, email: orderByEmail },
        type: "course-sale",
        amount: raTotal,
        meta: { courseId: courseObjectId, orderId: courseOrder[0]._id, commissionPercentage },
      }],
      { session: dbSession }
    );

    // RA wallet transaction: broker commission deduction
    if (brokerCommissionAmount > 0) {
      await WalletTransactionModel.create(
        [{
          serviceProviderId: instructor._id.toString(),
          orderId: courseOrder[0]._id.toString(),
          paymentId: paymentId || "marketplace",
          orderdBy: { name: orderByName, id: orderById, email: orderByEmail },
          type: "deduction",
          amount: brokerCommissionAmount,
          remarks: `Broker commission deducted for marketplace ${(marketplace as any).name}`,
        }],
        { session: dbSession }
      );
    }

    // Broker wallet transaction: commission credit
    if (brokerCommissionAmount > 0) {
      await WalletTransactionModel.create(
        [{
          serviceProviderId: broker._id.toString(),
          orderId: courseOrder[0]._id.toString(),
          paymentId: paymentId || "marketplace",
          orderdBy: { name: orderByName, id: orderById, email: orderByEmail },
          type: "marketplace-broker-commission",
          amount: brokerCommissionAmount,
          remarks: `Broker commission from marketplace ${(marketplace as any).name} for course ${courseDoc.title}`,
        }],
        { session: dbSession }
      );
    }

    // Enrollment
    let enrollment = await EnrollmentModel.findOne({
      userId: buyerObjectId,
      courseId: courseObjectId,
    });

    if (!enrollment) {
      enrollment = await EnrollmentModel.create({
        userId: buyerObjectId,
        courseId: courseObjectId,
        orderRef: courseOrder[0]._id,
        enrolledAt: new Date(),
        status: "active",
      });
    } else {
      enrollment.orderRef = courseOrder[0]._id;
      enrollment.status = "active";
      enrollment.enrolledAt = new Date();
      await enrollment.save();
    }

    await UserModel.findByIdAndUpdate(buyerObjectId, {
      $addToSet: { enrolledCourses: courseObjectId },
    });

    await dbSession.commitTransaction();
    dbSession.endSession();

    return res.json({
      success: true,
      message: "Marketplace course order recorded, broker commission applied, user enrolled",
      orderId: courseOrder[0]._id,
      enrollmentId: enrollment._id,
    });
  } catch (err: any) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    console.error("createAndEnrollMarketplace error:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Internal server error",
    });
  }
};

export const checkEnrollment = async (req: Request, res: Response) => {
  try {
    const { courseId, userId } = req.query;

    if (!courseId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing courseId or userId",
      });
    }

    const enrollment = await EnrollmentModel.findOne({
      userId,
      courseId,
      status: "active",
    });

    return res.json({
      success: true,
      enrolled: !!enrollment,
    });
  } catch (err) {
    console.error("checkEnrollment error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const topup = async (req: Request, res: Response) => {
  try {
    const { spID, amount, transactionId } = req.body;

    // 1️⃣ Validate input
    if (!spID || !amount || !transactionId) {
      return res.status(400).json({
        success: false,
        message: "spID and amount and transactionId  are required",
      });
    }

    const parsedAmount = Number(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
      });
    }
    const existingTransaction = await WalletTransactionModel.findOne({
      paymentId: transactionId,
    });
    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: "Transaction is already in use",
      });
    }

    // 2️⃣ Find service provider
    const serviceProvider = await ServiceProviderRegModel.findById(spID);

    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: "Service Provider not found",
      });
    }

    // 3️⃣ Create wallet transaction
    const walletTransaction = new WalletTransactionModel({
      serviceProviderId: spID,
      orderdBy: {
        name: serviceProvider.RegName || "NA",
        id: spID,
        email: serviceProvider.email || "NA",
      },
      paymentId: "transactionId", // or pass razorpay_payment_id later
      orderId: "RAZORPAY",
      amount: parsedAmount,
      type: "topup",
    });

    await walletTransaction.save();

    // 4️⃣ Initialize wallet if not present
    if (!serviceProvider.wallet) {
      serviceProvider.wallet = {
        amount: 0,
        transactions: [],
      };
    }

    // 5️⃣ Update wallet
    serviceProvider.wallet.amount += parsedAmount;
    serviceProvider.wallet.transactions.push(walletTransaction._id);

    await serviceProvider.save();

    await notifyWalletChange({
      spId: String(serviceProvider._id),
      spName: serviceProvider.RegName,
      amount: parsedAmount,
      direction: "credit",
      reason: "wallet top-up",
      newBalance: serviceProvider.wallet.amount,
    });

    // 6️⃣ Response
    return res.status(200).json({
      success: true,
      message: "Wallet recharged successfully",
      balance: serviceProvider.wallet.amount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to recharge wallet",
      error,
    });
  }
};

export const updateLead = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id; // secure
    const { serviceId, status, type } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Lead type is required",
      });
    }

    // Find the item based on type
    let item: any = null;
    let providerId: string | undefined;

    if (type === "service") {
      item = await ServiceModel.findById(serviceId);
      providerId = item?.authorData?.id;
    } else if (type === "portfolio") {
      item = await Portfolio.findById(serviceId);
      providerId = item?.authorData?.id;
    } else if (type === "package") {
      item = await PackageModel.findById(serviceId);
      providerId = item?.authorData?.id;
    }

    if (!item) {
      return res.status(400).json({
        success: false,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
      });
    }

    // findOneAndUpdate with upsert returns the PREVIOUS doc by default. When
    // it's null the lead was just created — fire a one-time bell notification
    // to the SP so they can engage while the lead is hot.
    const prevLead = await LeadModel.findOneAndUpdate(
      { userId, serviceId, providerId, type },
      {
        status,
        lastStepAt: new Date(),
      },
      { upsert: true }
    );

    if (!prevLead && providerId) {
      try {
        const buyer = await UserModel.findById(userId).select("name email");
        const buyerName = buyer?.name || "A customer";
        const itemName =
          (item as { title?: string; portfolioName?: string }).title ||
          (item as { title?: string; portfolioName?: string }).portfolioName ||
          (type === "portfolio" ? "your portfolio" : "your plan");

        await sendNotification({
          recipientIds: [String(providerId)],
          recipientRole: "provider",
          message: `New lead — ${buyerName} is interested in ${itemName}`,
          type: "lead-new",
          category: "admin",
          sentBy: { id: String(userId), name: buyerName },
          postLink: "/dashboard/serviceprovider/leads",
          ctaLabel: "View Lead",
        });
      } catch (notifyErr) {
        console.error("new-lead SP notification failed:", notifyErr);
      }
    }

    return res.json({ success: true, lead: prevLead });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Lead update failed" });
  }
};

/**
 * GET /api/payment/user-billing?userId=xxx
 * Returns all orders (services, portfolios, packages) + course orders for a user.
 */
export const getUserBilling = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    const [orders, courseOrders] = await Promise.all([
      OrderModel.find({ "orderdBy.id": userId })
        .select(
          "subscribedToId serviceName orderdBy soldBy subtotal gst total amount paymentMethod type validity isExpired invoiceLink startDate endDate isRenewal createdAt"
        )
        .sort({ createdAt: -1 })
        .lean(),
      CourseOrderModel.find({ buyerId: userId, status: "paid" })
        .populate("courseId", "title")
        .select("courseId subtotal gst total status createdAt")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: { orders, courseOrders },
    });
  } catch (error) {
    console.error("Error fetching user billing:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch billing data" });
  }
};
