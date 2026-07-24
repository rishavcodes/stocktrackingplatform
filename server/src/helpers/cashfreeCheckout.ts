const CASHFREE_API_VERSION = "2023-08-01";

function getCashfreeBaseUrl(): string {
  return process.env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

export interface CashfreeOrderParams {
  appId: string;
  secretKey: string;
  orderId: string;
  orderAmount: number;
  orderCurrency?: string;
  customerDetails: {
    customer_id: string;
    customer_phone?: string;
    customer_email?: string;
    customer_name?: string;
  };
  returnUrl?: string;
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  payment_session_id: string;
  order_status: string;
}

/**
 * Creates a Cashfree order via their PG REST API.
 * Returns payment_session_id which the frontend uses to open the Cashfree checkout.
 */
export async function createCashfreeOrder(
  params: CashfreeOrderParams
): Promise<CashfreeOrderResponse> {
  const baseUrl = getCashfreeBaseUrl();

  const body: any = {
    order_id: params.orderId,
    order_amount: params.orderAmount,
    order_currency: params.orderCurrency || "INR",
    customer_details: params.customerDetails,
  };

  if (params.returnUrl) {
    body.order_meta = { return_url: params.returnUrl };
  }

  const response = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": params.appId,
      "x-client-secret": params.secretKey,
      "x-api-version": CASHFREE_API_VERSION,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message || `Cashfree order creation failed (${response.status})`
    );
  }

  return data as CashfreeOrderResponse;
}

/**
 * Fetches order status from Cashfree to verify payment server-side.
 */
export async function getCashfreeOrderStatus(
  appId: string,
  secretKey: string,
  orderId: string
): Promise<any> {
  const baseUrl = getCashfreeBaseUrl();

  const response = await fetch(`${baseUrl}/orders/${orderId}`, {
    method: "GET",
    headers: {
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": CASHFREE_API_VERSION,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message || `Failed to fetch Cashfree order (${response.status})`
    );
  }

  return data;
}

/**
 * Fetches payments for a Cashfree order to get payment details after completion.
 */
export async function getCashfreePaymentsForOrder(
  appId: string,
  secretKey: string,
  orderId: string
): Promise<any[]> {
  const baseUrl = getCashfreeBaseUrl();

  const response = await fetch(`${baseUrl}/orders/${orderId}/payments`, {
    method: "GET",
    headers: {
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": CASHFREE_API_VERSION,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Failed to fetch Cashfree payments (${response.status})`
    );
  }

  return data;
}
