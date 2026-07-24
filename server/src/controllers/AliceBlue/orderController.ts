import { Request, Response } from "express";
import axios from "axios";
import { getAliceBlueBaseUrl } from "../../config/aliceBlue";
import { sendNotification } from "../../helpers/sendNotification";

// Tradebox user id is passed in the `x-tradebox-user-id` header so the
// broker controller can attribute trade notifications without depending
// on our session middleware. If the header is missing we skip the
// notification — the order still goes through normally.
function getTradeboxUserId(req: Request): string | null {
  const v = req.headers["x-tradebox-user-id"];
  if (typeof v !== "string" || !v) return null;
  return v;
}

function describeAliceOrder(orders: any[]): string {
  if (!Array.isArray(orders) || orders.length === 0) return "your order";
  const o = orders[0];
  const side = o?.transactionType === "BUY" ? "Buy " : o?.transactionType === "SELL" ? "Sell " : "";
  const sym = o?.instrumentId || "instrument";
  const qty = o?.quantity ? `${o.quantity} ` : "";
  return `${side}${qty}${sym}`.trim();
}

/**
 * Interface for Place Order request payload
 */
interface PlaceOrderPayload {
  exchange: string;
  instrumentId: string;
  transactionType: "BUY" | "SELL";
  quantity: number;
  product: string;
  orderComplexity: string;
  orderType: string;
  validity: string;
  price?: string;
  slTriggerPrice?: string;
  trailingSlAmount?: string;
  disclosedQuantity?: number;
  marketProtectionPercent?: string;
  apiOrderSource?: string;
  algoId?: string;
  orderTag?: string;
  slLegPrice?: string;
  targetLegPrice?: string;
  deviceId?: string;
}

/**
 * @route POST /api/aliceblue/orders/place-order
 * @desc Place a new order on Alice Blue
 * @access Private (requires userSession)
 * 
 * Request body should be an array of order objects:
 * [
 *   {
 *     "exchange": "NSE",
 *     "instrumentId": "22",
 *     "transactionType": "BUY",
 *     "quantity": 30,
 *     "product": "LONGTERM",
 *     "orderComplexity": "REGULAR",
 *     "orderType": "LIMIT",
 *     "validity": "DAY",
 *     "price": "1120.15",
 *     ...
 *   }
 * ]
 * 
 * Headers:
 *   Authorization: Bearer {userSession}
 */
export const placeOrder = async (req: Request, res: Response) => {
  try {
    // Get user session from middleware (already validated)
    const userSession = (req as any).aliceBlueSession;

    // Validate request body
    if (!req.body || !Array.isArray(req.body) || req.body.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body must be a non-empty array of order objects",
      });
    }

    // Validate required fields for each order
    const requiredFields = [
      "exchange",
      "instrumentId",
      "transactionType",
      "quantity",
      "orderComplexity",
      "product",
      "orderType",
      "validity",
    ];

    for (const order of req.body) {
      const missingFields = requiredFields.filter(
        (field) => !order.hasOwnProperty(field)
      );

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      // Validate transactionType
      if (!["BUY", "SELL"].includes(order.transactionType)) {
        return res.status(400).json({
          success: false,
          message: "transactionType must be either 'BUY' or 'SELL'",
        });
      }

      // Validate quantity
      if (typeof order.quantity !== "number" || order.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "quantity must be a positive number",
        });
      }
    }

    const baseUrl = getAliceBlueBaseUrl();
    const endpoint = `${baseUrl}/open-api/od/v1/orders/placeorder`;

    // Make API call to Alice Blue
    const response = await axios.post(endpoint, req.body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession}`,
      },
      timeout: 7000,
    });

    const userId = getTradeboxUserId(req);
    const orderDesc = describeAliceOrder(req.body);

    // Check response status
    if (response.data.status === "Ok") {
      if (userId) {
        sendNotification({
          recipientIds: [userId],
          recipientRole: "user",
          message: `Your order for ${orderDesc} has been placed.`,
          type: "trade-placed",
          category: "broker",
          sentBy: { id: "aliceblue", name: "Alice Blue" },
          broker: "aliceblue",
          postLink: "/dashboard/user/orders",
          ctaLabel: "View Order",
        });
      }
      return res.status(200).json({
        success: true,
        message: response.data.message || "Order placed successfully",
        data: response.data.result,
      });
    } else {
      if (userId) {
        sendNotification({
          recipientIds: [userId],
          recipientRole: "user",
          message: `Your order for ${orderDesc} was rejected. ${response.data.message || ""}`.trim(),
          type: "trade-rejected",
          category: "broker",
          sentBy: { id: "aliceblue", name: "Alice Blue" },
          broker: "aliceblue",
          postLink: "/dashboard/user/orders",
          ctaLabel: "Retry",
        });
      }
      return res.status(400).json({
        success: false,
        message: response.data.message || "Failed to place order",
        error: response.data,
      });
    }
  } catch (error: any) {
    console.error("Error placing order:", error);

    try {
      const userId = getTradeboxUserId(req);
      const orderDesc = describeAliceOrder(req.body);
      const errMsg = error?.response?.data?.message || error?.message || "Broker error";
      if (userId) {
        sendNotification({
          recipientIds: [userId],
          recipientRole: "user",
          message: `Your order for ${orderDesc} could not be placed. ${errMsg}`,
          type: "trade-rejected",
          category: "broker",
          sentBy: { id: "aliceblue", name: "Alice Blue" },
          broker: "aliceblue",
          postLink: "/dashboard/user/orders",
          ctaLabel: "Retry",
        });
      }
    } catch {
      // never let notification path swallow the underlying error
    }

    // Handle axios errors
    if (error.response) {
      const errorData = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: errorData.message || "Failed to place order",
        error: errorData,
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
 * @route GET /api/aliceblue/orders/book
 * @desc Get order book (all active orders)
 * @access Private (requires userSession)
 * 
 * Headers:
 *   Authorization: Bearer {userSession}
 */
export const getOrderBook = async (req: Request, res: Response) => {
  try {
    // Get user session from middleware (already validated)
    const userSession = (req as any).aliceBlueSession;

    const baseUrl = getAliceBlueBaseUrl();
    const endpoint = `${baseUrl}/open-api/od/v1/orders/book`;

    // Make API call to Alice Blue
    const response = await axios.get(endpoint, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession}`,
      },
      timeout: 7000,
    });

    // Check response status
    if (response.data.status === "Ok") {
      return res.status(200).json({
        success: true,
        message: response.data.message || "Order book retrieved successfully",
        data: response.data.result,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: response.data.message || "Failed to retrieve order book",
        error: response.data,
      });
    }
  } catch (error: any) {
    console.error("Error getting order book:", error);

    // Handle axios errors
    if (error.response) {
      const errorData = error.response.data;
      return res.status(error.response.status || 500).json({
        success: false,
        message: errorData.message || "Failed to retrieve order book",
        error: errorData,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/** Helper: forward Alice Blue API response (status/message/result) or error */
function handleAliceBlueResponse(res: Response, response: any, errMessage: string) {
  if (response.data.status === "Ok") {
    return res.status(200).json({
      success: true,
      message: response.data.message || "Success",
      data: response.data.result,
    });
  }
  return res.status(400).json({
    success: false,
    message: response.data.message || errMessage,
    error: response.data,
  });
}

/** Helper: forward axios error to response */
function handleAxiosError(res: Response, error: any, errMessage: string) {
  if (error.response) {
    const errorData = error.response.data;
    return res.status(error.response.status || 500).json({
      success: false,
      message: errorData?.message || errMessage,
      error: errorData,
    });
  }
  return res.status(500).json({
    success: false,
    message: "Internal server error",
    error: error.message,
  });
}

/**
 * @route POST /api/aliceblue/orders/history
 * @desc Order History – record of past orders (body: { brokerOrderId })
 * Headers: Authorization: Bearer {userSession}
 */
export const orderHistory = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).aliceBlueSession;
    const baseUrl = getAliceBlueBaseUrl();
    const endpoint = `${baseUrl}/open-api/od/v1/orders/history`;
    const response = await axios.post(endpoint, req.body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession}`,
      },
      timeout: 7000,
    });
    return handleAliceBlueResponse(res, response, "Failed to get order history");
  } catch (error: any) {
    console.error("Error fetching order history:", error);
    return handleAxiosError(res, error, "Failed to get order history");
  }
};

/**
 * @route POST /api/aliceblue/orders/modify
 * @desc Modify order – change price, quantity, or type
 * Body: brokerOrderId, quantity?, orderType?, slTriggerPrice?, price?, slLegPrice?, trailingSLAmount?, targetLegPrice?, validity?, disclosedQuantity?, marketProtection?, deviceId?
 * Headers: Authorization: Bearer {userSession}
 */
export const modifyOrder = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).aliceBlueSession;
    const baseUrl = getAliceBlueBaseUrl();
    const endpoint = `${baseUrl}/open-api/od/v1/orders/modify`;
    const response = await axios.post(endpoint, req.body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession}`,
      },
      timeout: 7000,
    });
    const userId = getTradeboxUserId(req);
    if (userId && response.data?.status === "Ok") {
      sendNotification({
        recipientIds: [userId],
        recipientRole: "user",
        message: `Your order has been modified.`,
        type: "trade-modified",
        category: "broker",
        sentBy: { id: "aliceblue", name: "Alice Blue" },
        broker: "aliceblue",
        postLink: "/dashboard/user/orders",
        ctaLabel: "View Order",
      });
    }
    return handleAliceBlueResponse(res, response, "Failed to modify order");
  } catch (error: any) {
    console.error("Error modifying order:", error);
    return handleAxiosError(res, error, "Failed to modify order");
  }
};

/**
 * @route POST /api/aliceblue/orders/cancel
 * @desc Cancel order (body: { brokerOrderId })
 * Headers: Authorization: Bearer {userSession}
 */
export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).aliceBlueSession;
    const baseUrl = getAliceBlueBaseUrl();
    const endpoint = `${baseUrl}/open-api/od/v1/orders/cancel`;
    const response = await axios.post(endpoint, req.body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession}`,
      },
      timeout: 7000,
    });
    const userId = getTradeboxUserId(req);
    if (userId && response.data?.status === "Ok") {
      sendNotification({
        recipientIds: [userId],
        recipientRole: "user",
        message: `Your order has been cancelled.`,
        type: "trade-cancelled",
        category: "broker",
        sentBy: { id: "aliceblue", name: "Alice Blue" },
        broker: "aliceblue",
        postLink: "/dashboard/user/orders",
        ctaLabel: "View Order",
      });
    }
    return handleAliceBlueResponse(res, response, "Failed to cancel order");
  } catch (error: any) {
    console.error("Error canceling order:", error);
    return handleAxiosError(res, error, "Failed to cancel order");
  }
};

/**
 * @route GET /api/aliceblue/orders/trades
 * @desc Trade Book – executed trades
 * Headers: Authorization: Bearer {userSession}
 */
export const getTradeBook = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).aliceBlueSession;
    const baseUrl = getAliceBlueBaseUrl();
    const endpoint = `${baseUrl}/open-api/od/v1/orders/trades`;
    const response = await axios.get(endpoint, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession}`,
      },
      timeout: 7000,
    });
    return handleAliceBlueResponse(res, response, "Failed to get trade book");
  } catch (error: any) {
    console.error("Error getting trade book:", error);
    return handleAxiosError(res, error, "Failed to get trade book");
  }
};

/**
 * @route POST /api/aliceblue/orders/checkMargin
 * @desc Single order margin (body: exchange, instrumentId, transactionType, quantity, product, orderComplexity, orderType, price?, validity?, slTriggerPrice?)
 * Headers: Authorization: Bearer {userSession}
 */
export const checkMargin = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).aliceBlueSession;
    const baseUrl = getAliceBlueBaseUrl();
    const endpoint = `${baseUrl}/open-api/od/v1/orders/checkMargin`;
    const response = await axios.post(endpoint, req.body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession}`,
      },
      timeout: 7000,
    });
    return handleAliceBlueResponse(res, response, "Failed to check margin");
  } catch (error: any) {
    console.error("Error checking margin:", error);
    return handleAxiosError(res, error, "Failed to check margin");
  }
};

/**
 * @route POST /api/aliceblue/orders/basket/margin
 * @desc Basket margin (body: array of { exchange, tradingSymbol, price, qty, product, priceType, triggerPrice?, transType })
 * Headers: Authorization: Bearer {userSession}
 */
export const basketMargin = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).aliceBlueSession;
    const baseUrl = getAliceBlueBaseUrl();
    const endpoint = `${baseUrl}/open-api/od/v1/orders/basket/margin`;
    const response = await axios.post(endpoint, req.body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession}`,
      },
      timeout: 7000,
    });
    return handleAliceBlueResponse(res, response, "Failed to get basket margin");
  } catch (error: any) {
    console.error("Error getting basket margin:", error);
    return handleAxiosError(res, error, "Failed to get basket margin");
  }
};

/**
 * @route POST /api/aliceblue/orders/exit/sno
 * @desc Exit bracket order (body: array of { orderNo, orderComplexity })
 * Headers: Authorization: Bearer {userSession}
 */
export const exitBracketOrder = async (req: Request, res: Response) => {
  try {
    const userSession = (req as any).aliceBlueSession;
    const baseUrl = getAliceBlueBaseUrl();
    const endpoint = `${baseUrl}/open-api/od/v1/orders/exit/sno`;
    const response = await axios.post(endpoint, req.body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession}`,
      },
      timeout: 7000,
    });
    return handleAliceBlueResponse(res, response, "Failed to exit bracket order");
  } catch (error: any) {
    console.error("Error exiting bracket order:", error);
    return handleAxiosError(res, error, "Failed to exit bracket order");
  }
};
