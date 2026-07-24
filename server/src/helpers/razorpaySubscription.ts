import Razorpay from "razorpay";

/**
 * Get a Razorpay instance.
 * Uses provided keys or falls back to platform env keys.
 */
function getRazorpayInstance(keyId?: string, keySecret?: string): Razorpay {
  return new Razorpay({
    key_id: (keyId || process.env.RAZORPAY_API_KEY) as string,
    key_secret: (keySecret || process.env.RAZORPAY_SECRET) as string,
  });
}

/**
 * Calculate the Razorpay billing cycle based on plan validity.
 * Charges 1 day before expiry to avoid service interruption.
 *
 * - Service/Package validity is in days (e.g. "30")
 * - Portfolio validity is like "12 months" or "1 year"
 */
export function calculateBillingCycle(
  validity: string,
  type: string
): { period: "daily" | "weekly" | "monthly" | "yearly"; interval: number } {
  if (type === "portfolio") {
    const match = validity.match(/(\d+)\s*(month|year)/i);
    if (match) {
      const num = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      if (unit.startsWith("year")) {
        // e.g. "1 year"  → period: "monthly", interval: 11
        // e.g. "2 years" → period: "monthly", interval: 23
        return { period: "monthly", interval: Math.max(num * 12 - 1, 1) };
      }
      // e.g. "3 months" → period: "monthly", interval: 2
      // e.g. "1 month"  → period: "monthly", interval: 1 (Razorpay min)
      return { period: "monthly", interval: Math.max(num - 1, 1) };
    }
  }

  // Service/Package: validity is in days (e.g. "30")
  const days = parseInt(validity) || 30;
  const billingDays = Math.max(days - 1, 7); // Razorpay daily interval min is 7
  return { period: "daily", interval: billingDays };
}

/**
 * Create a Razorpay Plan (reusable billing template).
 * Pass keyId/keySecret to use SP keys instead of platform keys.
 */
export async function createRazorpayPlan(
  params: {
    name: string;
    amountInPaise: number;
    period: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    description?: string;
  },
  keyId?: string,
  keySecret?: string
) {
  const razorpay = getRazorpayInstance(keyId, keySecret);
  return razorpay.plans.create({
    period: params.period,
    interval: params.interval,
    item: {
      name: params.name,
      amount: params.amountInPaise,
      currency: "INR",
      description: params.description || `Auto-renewal plan for ${params.name}`,
    },
  });
}

/**
 * Create a Razorpay Subscription linked to a plan.
 * Pass keyId/keySecret to use SP keys instead of platform keys.
 */
export async function createRazorpaySubscription(
  params: {
    planId: string;
    totalCount?: number;
    customerNotify?: boolean;
    notes?: Record<string, string>;
  },
  keyId?: string,
  keySecret?: string
) {
  const razorpay = getRazorpayInstance(keyId, keySecret);
  return razorpay.subscriptions.create({
    plan_id: params.planId,
    total_count: params.totalCount || 120, // ~10 years, user can cancel anytime
    customer_notify: 0, // Must be 0 (integer) — fixes "Invoices disabled because fee bearer is customer"
    notes: params.notes || {},
  } as any);
}

/**
 * Fetch a Razorpay Subscription by ID.
 * Pass keyId/keySecret to use SP keys instead of platform keys.
 */
export async function fetchRazorpaySubscription(
  subscriptionId: string,
  keyId?: string,
  keySecret?: string
) {
  const razorpay = getRazorpayInstance(keyId, keySecret);
  return razorpay.subscriptions.fetch(subscriptionId);
}

/**
 * Cancel a Razorpay Subscription.
 * @param cancelAtCycleEnd - if true, subscription stays active until current cycle ends
 * Pass keyId/keySecret to use SP keys instead of platform keys.
 */
export async function cancelRazorpaySubscription(
  subscriptionId: string,
  cancelAtCycleEnd: boolean = true,
  keyId?: string,
  keySecret?: string
) {
  const razorpay = getRazorpayInstance(keyId, keySecret);
  return razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
}
