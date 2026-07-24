import { Request, Response } from "express";
import { MandateModel } from "../models/MandateModel";
import { RazorpayKeyModel } from "../models/IntegrationModels";
import {
  cancelRazorpaySubscription,
  fetchRazorpaySubscription,
} from "../helpers/razorpaySubscription";
import { processAutoRenewal } from "../services/autoRenewalService";
import { OrderModel } from "../models/TransactionModels";

/**
 * Cancel a user's auto-renewal mandate.
 * POST /api/mandate/cancel/:mandateId
 */
export const cancelMandate = async (req: Request, res: Response) => {
  try {
    const { mandateId } = req.params;

    const mandate = await MandateModel.findById(mandateId);

    if (!mandate) {
      return res.status(404).json({
        success: false,
        message: "Mandate not found",
      });
    }

    // Authorization: verify the mandate belongs to the requesting user
    const userId = (req as any).userId || (req as any).user?.id;
    if (mandate.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this mandate",
      });
    }

    if (mandate.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Mandate is already cancelled",
      });
    }

    // Cancel on Razorpay (at cycle end so current period stays active)
    try {
      await cancelRazorpaySubscription(
        mandate.razorpaySubscriptionId,
        true // cancel at cycle end
      );
    } catch (rzpErr: any) {
      console.error(
        "[MANDATE] Razorpay cancellation failed:",
        rzpErr?.message || rzpErr
      );
      // If Razorpay says it's already cancelled, proceed
      if (!rzpErr?.message?.includes("already cancelled")) {
        return res.status(500).json({
          success: false,
          message: "Failed to cancel subscription on payment gateway",
        });
      }
    }

    // Update local mandate status
    mandate.status = "cancelled";
    await mandate.save();

    return res.status(200).json({
      success: true,
      message:
        "Auto-renewal cancelled successfully. Your current plan will remain active until its expiry.",
    });
  } catch (error) {
    console.error("[MANDATE] Cancel error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * Get mandate/auto-renewal status for an order.
 * GET /api/mandate/status/:orderId
 */
export const getMandateStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const mandate = await MandateModel.findOne({ orderId });

    if (!mandate) {
      return res.status(200).json({
        success: true,
        hasMandate: false,
        message: "No auto-renewal mandate found for this order",
      });
    }

    // Optionally fetch live status from Razorpay
    let razorpayStatus = null;
    try {
      const rzpSub = await fetchRazorpaySubscription(
        mandate.razorpaySubscriptionId
      );
      razorpayStatus = {
        status: rzpSub.status,
        paidCount: rzpSub.paid_count,
        remainingCount: rzpSub.remaining_count,
        nextChargeAt: rzpSub.charge_at
          ? new Date(rzpSub.charge_at * 1000)
          : null,
      };
    } catch {
      // If Razorpay fetch fails, just return local data
    }

    return res.status(200).json({
      success: true,
      hasMandate: true,
      mandate: {
        id: mandate._id,
        status: mandate.status,
        paidCount: mandate.paidCount,
        totalCount: mandate.totalCount,
        nextChargeAt: mandate.nextChargeAt,
        renewalHistory: mandate.renewalHistory,
        planDetails: {
          serviceName: mandate.planDetails.serviceName,
          total: mandate.planDetails.total,
          validity: mandate.planDetails.validity,
        },
      },
      razorpayStatus,
    });
  } catch (error) {
    console.error("[MANDATE] Status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * Get all mandates for the current user.
 * GET /api/mandate/my-mandates
 */
export const getMyMandates = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || (req as any).user?.id;

    const mandates = await MandateModel.find({ userId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      mandates: mandates.map((m) => ({
        id: m._id,
        status: m.status,
        serviceName: m.planDetails.serviceName,
        total: m.planDetails.total,
        validity: m.planDetails.validity,
        paidCount: m.paidCount,
        nextChargeAt: m.nextChargeAt,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error("[MANDATE] My mandates error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * TEST ONLY: Simulate a subscription charge for a mandate.
 * Runs the exact same renewal logic the cron uses, bypassing Razorpay's paid_count check.
 * POST /api/mandate/test/simulate-charge/:mandateId
 */
export const simulateMandateCharge = async (req: Request, res: Response) => {
  try {
    const { mandateId } = req.params;

    const mandate = await MandateModel.findById(mandateId);
    if (!mandate) {
      return res.status(404).json({ success: false, message: "Mandate not found" });
    }

    if (!["active", "authenticated"].includes(mandate.status)) {
      return res.status(400).json({
        success: false,
        message: `Mandate is in '${mandate.status}' status, cannot simulate charge`,
      });
    }

    const spKeys = await RazorpayKeyModel.findOne({ userId: mandate.serviceProviderId })
      .select("keyId keySecret")
      .lean();

    let rzpSub: any = null;
    if (spKeys) {
      try {
        rzpSub = await fetchRazorpaySubscription(
          mandate.razorpaySubscriptionId,
          spKeys.keyId,
          spKeys.keySecret
        );
      } catch (rzpErr: any) {
        console.warn("[MANDATE][TEST] Razorpay fetch failed, proceeding with simulation:", rzpErr?.message);
      }
    }

    const latestOrder = await OrderModel.findOne({
      "orderdBy.id": mandate.userId,
      subscribedToId: mandate.subscribedToId,
      paymentStatus: "verified",
    }).sort({ createdAt: -1 });

    const previousOrderId = latestOrder
      ? latestOrder._id.toString()
      : mandate.orderId.toString();

    const chargeNum = mandate.paidCount + 1;
    const paymentId = `test_sim_${mandate.razorpaySubscriptionId}_${chargeNum}`;

    console.log(`[MANDATE][TEST] Simulating charge #${chargeNum} for mandate ${mandateId}`);
    console.log(`[MANDATE][TEST] previousOrderId=${previousOrderId}, paymentId=${paymentId}`);

    const result = await processAutoRenewal({
      planDetails: mandate.planDetails as any,
      razorpayPaymentId: paymentId,
      previousOrderId,
    });

    console.log(`[MANDATE][TEST] processAutoRenewal result:`, result);

    mandate.renewalHistory.push({
      chargedAt: new Date(),
      razorpayPaymentId: paymentId,
      newOrderId: result.newOrderId ? (result.newOrderId as any) : undefined,
      amount: mandate.planDetails.total,
      status: result.success ? "success" : "failed",
    } as any);

    mandate.paidCount = chargeNum;
    if (rzpSub?.charge_at) {
      mandate.nextChargeAt = new Date(rzpSub.charge_at * 1000);
    } else {
      const validityDays = parseInt(mandate.planDetails.validity) || 30;
      mandate.nextChargeAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
    }

    await mandate.save();

    return res.status(200).json({
      success: result.success,
      message: result.success
        ? `Simulated charge #${chargeNum} successful`
        : `Simulated charge #${chargeNum} failed`,
      newOrderId: result.newOrderId,
      error: result.error,
      mandate: {
        paidCount: mandate.paidCount,
        nextChargeAt: mandate.nextChargeAt,
        renewalHistoryLength: mandate.renewalHistory.length,
      },
    });
  } catch (error) {
    console.error("[MANDATE][TEST] Simulate charge error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
