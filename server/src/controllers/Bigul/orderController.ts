import { Request, Response } from "express";
import axios from "axios";
import { getBigulConfig, getBigulPapiBaseUrl } from "../../config/bigul";
import { getStoredVendorAuth } from "../../services/BigulPartnerSession";
import { UserModel } from "../../models/AuthModels";
import { sendNotification } from "../../helpers/sendNotification";

// Map a Bigul clientCode (from the request body) to the linked Tradebox
// user. Used to attribute trade notifications to the right inbox without
// the caller needing to pass our internal user id.
async function resolveBigulUserId(clientCode: unknown): Promise<string | null> {
  if (typeof clientCode !== "string" || !clientCode) return null;
  try {
    const user = await UserModel.findOne({
      "linkedBrokers.clientCode": clientCode,
      "linkedBrokers.brokerType": "bigul",
    }).select("_id");
    return user?._id?.toString() || null;
  } catch {
    return null;
  }
}

function describeOrder(body: any): string {
  const symbol = body?.ts || body?.tk || "your order";
  const qty = body?.qt ? `${body.qt} ${symbol}` : symbol;
  const side =
    body?.tt === "B" ? "Buy " : body?.tt === "S" ? "Sell " : "";
  return `${side}${qty}`.trim();
}

/**
 * @route POST /api/bigul/orders/place-order
 * @desc Place order (vr-place). Requires Bearer token (user JWT from Bigul SSO) and optional x-vendor-auth from session.
 * @access Private
 *
 * Headers: Authorization: Bearer {userJwt}
 * Body: Bigul vr-place payload (source, clientCode, es, pc, pr, mp, pt, qt, rt, tk, tp, ts, tt, am, os?, bc?, cf, pf, ur, ut?, dq)
 */
export const placeOrder = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).bigulSession;
    const config = getBigulConfig();

    if (!config.appKey || !config.appSecret) {
      return res.status(500).json({
        success: false,
        message: "Bigul API credentials are not configured",
      });
    }

    const headerVendorAuth = req.headers["x-vendor-auth"] as string | undefined;
    const storedVendorAuth = await getStoredVendorAuth();
    const vendorAuth = headerVendorAuth || storedVendorAuth || config.appSecret;
    const baseUrl = getBigulPapiBaseUrl();
    const endpoint = `${baseUrl}/api/v1/order/vr-place`;

    const response = await axios.post(endpoint, req.body, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.appKey,
        "x-api-secret": config.appSecret,
        "x-vendor-auth": vendorAuth,
        Authorization: `Bearer ${userSession}`,
      },
      timeout: config.timeout as number,
    });

    const data = response.data;
    const success = data.status === true || data.status === "true";
    const orderDesc = describeOrder(req.body);
    const userId = await resolveBigulUserId(req.body?.clientCode);

    if (success) {
      if (userId) {
        sendNotification({
          recipientIds: [userId],
          recipientRole: "user",
          message: `Your order for ${orderDesc} has been placed.`,
          type: "trade-placed",
          category: "broker",
          sentBy: { id: "bigul", name: "Bigul" },
          broker: "bigul",
          postLink: "/dashboard/user/orders",
          ctaLabel: "View Order",
        });
      }
      return res.status(200).json({
        success: true,
        message: data.message || "Order placed successfully",
        data: data.data ?? data,
      });
    }

    if (userId) {
      sendNotification({
        recipientIds: [userId],
        recipientRole: "user",
        message: `Your order for ${orderDesc} was rejected. ${data.message || ""}`.trim(),
        type: "trade-rejected",
        category: "broker",
        sentBy: { id: "bigul", name: "Bigul" },
        broker: "bigul",
        postLink: "/dashboard/user/orders",
        ctaLabel: "Retry",
      });
    }
    return res.status(400).json({
      success: false,
      message: data.message || "Failed to place order",
      error: data.error ?? data,
    });
  } catch (error: any) {
    console.error("Bigul place order error:", error);
    // Best-effort rejection notification on transport / 4xx-5xx errors.
    try {
      const userId = await resolveBigulUserId(req.body?.clientCode);
      const orderDesc = describeOrder(req.body);
      const errMsg =
        error?.response?.data?.message || error?.message || "Broker error";
      if (userId) {
        sendNotification({
          recipientIds: [userId],
          recipientRole: "user",
          message: `Your order for ${orderDesc} could not be placed. ${errMsg}`,
          type: "trade-rejected",
          category: "broker",
          sentBy: { id: "bigul", name: "Bigul" },
          broker: "bigul",
          postLink: "/dashboard/user/orders",
          ctaLabel: "Retry",
        });
      }
    } catch {
      // ignore — never let notification path swallow the underlying error
    }
    if (error.response) {
      const d = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: d?.message || "Failed to place order",
        error: d,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/bigul/orders/history
 * @desc Get execution history of a specific order by nest order number.
 * @access Private – Authorization: Bearer {userJwt}
 *
 * Body: { source, clientCode, nOrdNo }
 */
export const getOrderHistory = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).bigulSession;
    const config = getBigulConfig();

    if (!config.appKey || !config.appSecret) {
      return res.status(500).json({
        success: false,
        message: "Bigul API credentials are not configured",
      });
    }

    const { source, clientCode, nOrdNo } = req.body;
    if (!source || !clientCode || !nOrdNo) {
      return res.status(400).json({
        success: false,
        message: "source, clientCode and nOrdNo are required",
      });
    }

    const headerVendorAuth = req.headers["x-vendor-auth"] as string | undefined;
    const storedVendorAuth = await getStoredVendorAuth();
    const vendorAuth = headerVendorAuth || storedVendorAuth || config.appSecret;
    const baseUrl = getBigulPapiBaseUrl();
    const endpoint = `${baseUrl}/api/v1/order/order-history`;

    const response = await axios.post(
      endpoint,
      { source, clientCode, nOrdNo },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.appKey,
          "x-api-secret": config.appSecret,
          "x-vendor-auth": vendorAuth,
          Authorization: `Bearer ${userSession}`,
        },
        timeout: config.timeout as number,
      }
    );

    const data = response.data;
    const success = data.status === true || data.status === "true";

    if (success) {
      return res.status(200).json({
        success: true,
        message: data.message || "Order history retrieved successfully",
        data: data.data ?? data,
      });
    }

    return res.status(400).json({
      success: false,
      message: data.message || "Failed to get order history",
      error: data.error ?? data,
    });
  } catch (error: any) {
    console.error("Bigul order history error:", error);
    if (error.response) {
      const d = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: d?.message || "Failed to get order history",
        error: d,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/bigul/orders/book
 * @desc Get order book. Body: { source, clientCode }
 * @access Private – Authorization: Bearer {userJwt}
 */
export const getOrderBook = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).bigulSession;
    const config = getBigulConfig();

    if (!config.appKey || !config.appSecret) {
      return res.status(500).json({
        success: false,
        message: "Bigul API credentials are not configured",
      });
    }

    const { source, clientCode } = req.body;
    if (!source || !clientCode) {
      return res.status(400).json({
        success: false,
        message: "source and clientCode are required",
      });
    }

    const headerVendorAuth = req.headers["x-vendor-auth"] as string | undefined;
    const storedVendorAuth = await getStoredVendorAuth();
    const vendorAuth = headerVendorAuth || storedVendorAuth || config.appSecret;
    const baseUrl = getBigulPapiBaseUrl();
    const endpoint = `${baseUrl}/api/v1/order/order-book`;

    const response = await axios.post(endpoint, { source, clientCode }, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.appKey,
        "x-api-secret": config.appSecret,
        "x-vendor-auth": vendorAuth,
        Authorization: `Bearer ${userSession}`,
      },
      timeout: config.timeout as number,
    });

    const data = response.data;
    const success = data.status === true || data.status === "true";

    if (success) {
      return res.status(200).json({
        success: true,
        message: data.message || "Order book retrieved successfully",
        data: data.data ?? data,
      });
    }

    return res.status(400).json({
      success: false,
      message: data.message || "Failed to get order book",
      error: data.error ?? data,
    });
  } catch (error: any) {
    console.error("Bigul order book error:", error);
    if (error.response) {
      const d = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: d?.message || "Failed to get order book",
        error: d,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/bigul/orders/trade-book
 * @desc Get trade book. Body: { source, clientCode }
 * @access Private – Authorization: Bearer {userJwt}
 */
export const getTradeBook = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).bigulSession;
    const config = getBigulConfig();

    if (!config.appKey || !config.appSecret) {
      return res.status(500).json({
        success: false,
        message: "Bigul API credentials are not configured",
      });
    }

    const { source, clientCode } = req.body;
    if (!source || !clientCode) {
      return res.status(400).json({
        success: false,
        message: "source and clientCode are required",
      });
    }

    const headerVendorAuth = req.headers["x-vendor-auth"] as string | undefined;
    const storedVendorAuth = await getStoredVendorAuth();
    const vendorAuth = headerVendorAuth || storedVendorAuth || config.appSecret;
    const baseUrl = getBigulPapiBaseUrl();
    const endpoint = `${baseUrl}/api/v1/order/trade-book`;

    const response = await axios.post(endpoint, { source, clientCode }, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.appKey,
        "x-api-secret": config.appSecret,
        "x-vendor-auth": vendorAuth,
        Authorization: `Bearer ${userSession}`,
      },
      timeout: config.timeout as number,
    });

    const data = response.data;
    const success = data.status === true || data.status === "true";

    if (success) {
      return res.status(200).json({
        success: true,
        message: data.message || "Trade book retrieved successfully",
        data: data.data ?? data,
      });
    }

    return res.status(400).json({
      success: false,
      message: data.message || "Failed to get trade book",
      error: data.error ?? data,
    });
  } catch (error: any) {
    console.error("Bigul trade book error:", error);
    if (error.response) {
      const d = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: d?.message || "Failed to get trade book",
        error: d,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/bigul/orders/position-book
 * @desc Get net positions. Body: { source, clientCode }
 * @access Private – Authorization: Bearer {userJwt}
 */
export const getPositionBook = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).bigulSession;
    const config = getBigulConfig();

    if (!config.appKey || !config.appSecret) {
      return res.status(500).json({
        success: false,
        message: "Bigul API credentials are not configured",
      });
    }

    const { source, clientCode } = req.body;
    if (!source || !clientCode) {
      return res.status(400).json({
        success: false,
        message: "source and clientCode are required",
      });
    }

    const headerVendorAuth = req.headers["x-vendor-auth"] as string | undefined;
    const storedVendorAuth = await getStoredVendorAuth();
    const vendorAuth = headerVendorAuth || storedVendorAuth || config.appSecret;
    const baseUrl = getBigulPapiBaseUrl();
    const endpoint = `${baseUrl}/api/v1/order/get-position`;

    const response = await axios.post(endpoint, { source, clientCode }, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.appKey,
        "x-api-secret": config.appSecret,
        "x-vendor-auth": vendorAuth,
        Authorization: `Bearer ${userSession}`,
      },
      timeout: config.timeout as number,
    });

    const data = response.data;
    const success = data.status === true || data.status === "true";

    if (success) {
      return res.status(200).json({
        success: true,
        message: data.message || "Position book retrieved successfully",
        data: data.data ?? data,
      });
    }

    return res.status(400).json({
      success: false,
      message: data.message || "Failed to get position book",
      error: data.error ?? data,
    });
  } catch (error: any) {
    console.error("Bigul position book error:", error);
    if (error.response) {
      const d = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: d?.message || "Failed to get position book",
        error: d,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/bigul/orders/modify
 * @desc Modify an existing open order (vr-modify).
 * @access Private – Authorization: Bearer {userJwt}
 *
 * Body: { source, clientCode, no, vd, es, pc, pr, mp, pt, qt, rt, tk, tp, ts, tt, dq, sr, au, am?, os?, bc?, cf?, pf?, ur?, ut? }
 */
export const modifyOrder = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).bigulSession;
    const config = getBigulConfig();

    if (!config.appKey || !config.appSecret) {
      return res.status(500).json({
        success: false,
        message: "Bigul API credentials are not configured",
      });
    }

    const { source, clientCode, no, vd, es, pc, pr, mp, pt, qt, rt, tk, tp, ts, tt, dq, sr, au } = req.body;
    if (!source || !clientCode || !no || !vd || !es || !pc || pr === undefined || mp === undefined || !pt || !qt || !rt || !tk || tp === undefined || !ts || !tt || dq === undefined || !sr || !au) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: source, clientCode, no, vd, es, pc, pr, mp, pt, qt, rt, tk, tp, ts, tt, dq, sr, au",
      });
    }

    const headerVendorAuth = req.headers["x-vendor-auth"] as string | undefined;
    const storedVendorAuth = await getStoredVendorAuth();
    const vendorAuth = headerVendorAuth || storedVendorAuth || config.appSecret;
    const baseUrl = getBigulPapiBaseUrl();
    const endpoint = `${baseUrl}/api/v1/order/vr-modify`;

    const response = await axios.post(endpoint, req.body, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.appKey,
        "x-api-secret": config.appSecret,
        "x-vendor-auth": vendorAuth,
        Authorization: `Bearer ${userSession}`,
      },
      timeout: config.timeout as number,
    });

    const data = response.data;
    const success = data.status === true || data.status === "true";

    if (success) {
      const userId = await resolveBigulUserId(req.body?.clientCode);
      if (userId) {
        sendNotification({
          recipientIds: [userId],
          recipientRole: "user",
          message: `Your order for ${describeOrder(req.body)} has been modified.`,
          type: "trade-modified",
          category: "broker",
          sentBy: { id: "bigul", name: "Bigul" },
          broker: "bigul",
          postLink: "/dashboard/user/orders",
          ctaLabel: "View Order",
        });
      }
      return res.status(200).json({
        success: true,
        message: data.message || "Order modified successfully",
        data: data.data ?? data,
      });
    }

    return res.status(400).json({
      success: false,
      message: data.message || "Failed to modify order",
      error: data.error ?? data,
    });
  } catch (error: any) {
    console.error("Bigul modify order error:", error);
    if (error.response) {
      const d = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: d?.message || "Failed to modify order",
        error: d,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/bigul/orders/cancel
 * @desc Cancel an existing open order.
 * @access Private – Authorization: Bearer {userJwt}
 *
 * Body: { source, clientCode, on, am?, ts? }
 * Note: ts is mandatory when am = "YES"
 */
export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).bigulSession;
    const config = getBigulConfig();

    if (!config.appKey || !config.appSecret) {
      return res.status(500).json({
        success: false,
        message: "Bigul API credentials are not configured",
      });
    }

    const { source, clientCode, on, am, ts } = req.body;
    if (!source || !clientCode || !on) {
      return res.status(400).json({
        success: false,
        message: "source, clientCode and on (nest order number) are required",
      });
    }
    if (am === "YES" && !ts) {
      return res.status(400).json({
        success: false,
        message: "ts (trading symbol) is required when am is YES",
      });
    }

    const headerVendorAuth = req.headers["x-vendor-auth"] as string | undefined;
    const storedVendorAuth = await getStoredVendorAuth();
    const vendorAuth = headerVendorAuth || storedVendorAuth || config.appSecret;
    const baseUrl = getBigulPapiBaseUrl();
    const endpoint = `${baseUrl}/api/v1/order/cancel`;

    const response = await axios.post(endpoint, req.body, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.appKey,
        "x-api-secret": config.appSecret,
        "x-vendor-auth": vendorAuth,
        Authorization: `Bearer ${userSession}`,
      },
      timeout: config.timeout as number,
    });

    const data = response.data;
    const success = data.status === true || data.status === "true";

    if (success) {
      const userId = await resolveBigulUserId(req.body?.clientCode);
      if (userId) {
        sendNotification({
          recipientIds: [userId],
          recipientRole: "user",
          message: `Your order for ${describeOrder(req.body)} has been cancelled.`,
          type: "trade-cancelled",
          category: "broker",
          sentBy: { id: "bigul", name: "Bigul" },
          broker: "bigul",
          postLink: "/dashboard/user/orders",
          ctaLabel: "View Order",
        });
      }
      return res.status(200).json({
        success: true,
        message: data.message || "Order cancelled successfully",
        data: data.data ?? data,
      });
    }

    return res.status(400).json({
      success: false,
      message: data.message || "Failed to cancel order",
      error: data.error ?? data,
    });
  } catch (error: any) {
    console.error("Bigul cancel order error:", error);
    if (error.response) {
      const d = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: d?.message || "Failed to cancel order",
        error: d,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/bigul/orders/check-margin
 * @desc Calculate required margin for an order before placement.
 * @access Private – Authorization: Bearer {userJwt}
 *
 * Body: { source, clientCode, brnchId, exSeg, prc, prcTp, prod, qty, tok, trnsTp }
 */
export const checkMargin = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).bigulSession;
    const config = getBigulConfig();

    if (!config.appKey || !config.appSecret) {
      return res.status(500).json({
        success: false,
        message: "Bigul API credentials are not configured",
      });
    }

    const { source, clientCode, brnchId, exSeg, prc, prcTp, prod, qty, tok, trnsTp } = req.body;
    if (!source || !clientCode || !brnchId || !exSeg || prc === undefined || !prcTp || !prod || qty === undefined || !tok || !trnsTp) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: source, clientCode, brnchId, exSeg, prc, prcTp, prod, qty, tok, trnsTp",
      });
    }

    const headerVendorAuth = req.headers["x-vendor-auth"] as string | undefined;
    const storedVendorAuth = await getStoredVendorAuth();
    const vendorAuth = headerVendorAuth || storedVendorAuth || config.appSecret;
    const baseUrl = getBigulPapiBaseUrl();
    const endpoint = `${baseUrl}/api/v1/order/user-margin`;

    const response = await axios.post(endpoint, req.body, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.appKey,
        "x-api-secret": config.appSecret,
        "x-vendor-auth": vendorAuth,
        Authorization: `Bearer ${userSession}`,
      },
      timeout: config.timeout as number,
    });

    const data = response.data;
    const success = data.status === true || data.status === "true";

    if (success) {
      return res.status(200).json({
        success: true,
        message: data.message || "Margin check successful",
        data: data.data ?? data,
      });
    }

    return res.status(400).json({
      success: false,
      message: data.message || "Failed to check margin",
      error: data.error ?? data,
    });
  } catch (error: any) {
    console.error("Bigul check margin error:", error);
    if (error.response) {
      const d = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: d?.message || "Failed to check margin",
        error: d,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * @route POST /api/bigul/orders/user-limits
 * @desc Get segment-wise and product-wise RMS limits for a client.
 * @access Private – Authorization: Bearer {userJwt}
 *
 * Body: { source, clientCode, seg, exch, prod }
 */
/**
 * @route POST /api/bigul/orders/holdings
 * @desc Get DP holdings. Body: { source, clientCode }
 * @access Private – Authorization: Bearer {userJwt}
 */
export const getHoldings = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).bigulSession;
    const config = getBigulConfig();

    if (!config.appKey || !config.appSecret) {
      return res.status(500).json({
        success: false,
        message: "Bigul API credentials are not configured",
      });
    }

    const { source, clientCode } = req.body;
    if (!source || !clientCode) {
      return res.status(400).json({
        success: false,
        message: "source and clientCode are required",
      });
    }

    const headerVendorAuth = req.headers["x-vendor-auth"] as string | undefined;
    const storedVendorAuth = await getStoredVendorAuth();
    const vendorAuth = headerVendorAuth || storedVendorAuth || config.appSecret;
    const baseUrl = getBigulPapiBaseUrl();
    const endpoint = `${baseUrl}/api/v1/order/dp-holding`;

    const response = await axios.post(endpoint, { source, clientCode }, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.appKey,
        "x-api-secret": config.appSecret,
        "x-vendor-auth": vendorAuth,
        Authorization: `Bearer ${userSession}`,
      },
      timeout: config.timeout as number,
    });

    const data = response.data;
    const success = data.status === true || data.status === "true";

    if (success) {
      return res.status(200).json({
        success: true,
        message: data.message || "Holdings retrieved successfully",
        data: data.data ?? data,
      });
    }

    return res.status(400).json({
      success: false,
      message: data.message || "Failed to get holdings",
      error: data.error ?? data,
    });
  } catch (error: any) {
    console.error("Bigul holdings error:", error);
    if (error.response) {
      const d = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: d?.message || "Failed to get holdings",
        error: d,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getUserLimits = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).bigulSession;
    const config = getBigulConfig();

    if (!config.appKey || !config.appSecret) {
      return res.status(500).json({
        success: false,
        message: "Bigul API credentials are not configured",
      });
    }

    const { source, clientCode, seg, exch, prod } = req.body;
    if (!source || !clientCode || !seg || !exch || !prod) {
      return res.status(400).json({
        success: false,
        message: "source, clientCode, seg, exch and prod are required",
      });
    }

    const headerVendorAuth = req.headers["x-vendor-auth"] as string | undefined;
    const storedVendorAuth = await getStoredVendorAuth();
    const vendorAuth = headerVendorAuth || storedVendorAuth || config.appSecret;
    const baseUrl = getBigulPapiBaseUrl();
    const endpoint = `${baseUrl}/api/v1/order/user-limits`;

    const response = await axios.post(endpoint, req.body, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.appKey,
        "x-api-secret": config.appSecret,
        "x-vendor-auth": vendorAuth,
        Authorization: `Bearer ${userSession}`,
      },
      timeout: config.timeout as number,
    });

    const data = response.data;
    const success = data.status === true || data.status === "true";

    if (success) {
      return res.status(200).json({
        success: true,
        message: data.message || "User limits retrieved successfully",
        data: data.data ?? data,
      });
    }

    return res.status(400).json({
      success: false,
      message: data.message || "Failed to get user limits",
      error: data.error ?? data,
    });
  } catch (error: any) {
    console.error("Bigul user limits error:", error);
    if (error.response) {
      const d = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: d?.message || "Failed to get user limits",
        error: d,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
