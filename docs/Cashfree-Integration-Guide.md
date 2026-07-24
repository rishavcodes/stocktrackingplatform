# Cashfree Payment Gateway Integration — Complete Technical Guide

**Project:** TradeBox  
**Date:** March 2026  
**Stack:** Next.js (Frontend) + Express.js + MongoDB (Backend)

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Design](#3-database-design)
4. [Backend — Cashfree Helper Module](#4-backend--cashfree-helper-module)
5. [Backend — API Routes](#5-backend--api-routes)
6. [Backend — Credential Management (CRUD)](#6-backend--credential-management-crud)
7. [Backend — Checkout Controller](#7-backend--checkout-controller)
8. [Backend — Payment Verification](#8-backend--payment-verification)
9. [Frontend — Integrations Page (SP Setup)](#9-frontend--integrations-page-sp-setup)
10. [Frontend — Checkout Flow (User Payment)](#10-frontend--checkout-flow-user-payment)
11. [Environment Variables](#11-environment-variables)
12. [Razorpay vs Cashfree — Key Differences](#12-razorpay-vs-cashfree--key-differences)
13. [Common Errors & Fixes](#13-common-errors--fixes)
14. [Interview-Ready Explanation](#14-interview-ready-explanation)

---

## 1. Problem Statement

TradeBox is a **multi-tenant marketplace** where multiple Service Providers (SPs) sell services (courses, trading plans, etc.) to users. Each SP has their **own payment gateway credentials** — they receive payments directly into their own accounts.

Previously, only **Razorpay** was supported. Many SPs don't have Razorpay but have **Cashfree** accounts. We needed to:

- Let SPs **choose** between Razorpay and Cashfree on their profile.
- Store their Cashfree credentials (App ID, Secret Key) securely.
- During checkout, **dynamically open** the correct payment modal based on the SP's preference.
- **Verify payments** server-side for both gateways.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SP Integrations Page          User Checkout Page                │
│  ┌─────────────────┐          ┌──────────────────────┐          │
│  │ Select Gateway   │          │ Click "Pay Securely"  │          │
│  │ (Razorpay/CF)   │          │                        │          │
│  │ Enter API Keys   │          │ POST /checkout         │          │
│  │ Save/Update      │          │     ↓                  │          │
│  └────────┬────────┘          │ Response has "gateway"  │          │
│           │                    │     ↓                  │          │
│           │                    │ if "cashfree"          │          │
│           │                    │   → CF SDK checkout()  │          │
│           │                    │ if "razorpay"          │          │
│           │                    │   → Razorpay open()    │          │
│           │                    │     ↓                  │          │
│           │                    │ POST /createandverify   │          │
│           │                    └──────────────────────┘          │
└───────────┼──────────────────────────┼───────────────────────────┘
            │                          │
            ▼                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (Express.js)                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PaymentController.ts                                            │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ AddCashfreeKeys / updateCashfreeKeys / getCashfreeKeys │      │
│  │ AddRazorpayKeys / updateRazorpayKeys / getRazorpayKeys │      │
│  │ paymentCheckOut (branching by sp.services.integration)  │      │
│  │ createAndVerifyOrder (branching by payload fields)      │      │
│  └───────────────────────────────────────────────────────┘      │
│                          │                                       │
│                          ▼                                       │
│  cashfreeCheckout.ts (Helper)                                    │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ createCashfreeOrder()     → POST /pg/orders            │      │
│  │ getCashfreeOrderStatus()  → GET  /pg/orders/{id}       │      │
│  │ getCashfreePaymentsForOrder() → GET /pg/orders/{id}/pay│      │
│  └───────────────────────────────────────────────────────┘      │
│                          │                                       │
│                          ▼                                       │
│  MongoDB                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ CashfreeKeys  │  │ RazorpayKeys  │  │ ServiceProvider   │      │
│  │ (appId,       │  │ (keyId,       │  │ (services: {      │      │
│  │  secretKey,   │  │  keySecret,   │  │   integration:    │      │
│  │  userId)      │  │  userId)      │  │   "razorpay"|     │      │
│  └──────────────┘  └──────────────┘  │   "cashfree"  })  │      │
│                                       └──────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────────┐
│                   CASHFREE PG REST API                            │
│  Sandbox:    https://sandbox.cashfree.com/pg                     │
│  Production: https://api.cashfree.com/pg                         │
│  API Version: 2023-08-01                                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Design

### 3.1 CashfreeKeys Collection

**File:** `server/src/models/IntegrationModels.ts`

```typescript
const CashfreeKeySchema = new mongoose.Schema(
  {
    appId: { type: String, required: true },
    secretKey: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true,
    },
    name: { type: String },
    email: { type: String },
  },
  { timestamps: true }
);

export const CashfreeKeyModel = mongoose.model("CashfreeKeys", CashfreeKeySchema);
```

**Why a separate collection?**
- Security isolation — credentials can be encrypted independently.
- Clean separation from the SP document.
- Same pattern as the existing `RazorpayKeys` collection.

### 3.2 ServiceProvider Schema Update

**File:** `server/src/models/AuthModels.ts`

```typescript
const servicesSchema = new mongoose.Schema({
  recommendations: { type: Boolean, default: false },
  paymentGateway: { type: Boolean, default: false },
  // ... other service flags ...
  integration: {
    type: String,
    enum: ["razorpay", "cashfree"],
    default: "razorpay",
  },
});

const ServiceProviderRegSchema = new mongoose.Schema({
  // ... existing fields ...
  razorpayKey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RazorpayKeys",
  },
  cashfreeKey: {                         // NEW
    type: mongoose.Schema.Types.ObjectId,
    ref: "CashfreeKeys",
  },
  services: servicesSchema,
});
```

**The `integration` field is the single source of truth** — it determines which gateway to use at checkout. It's updated whenever the SP saves/updates keys for either gateway.

---

## 4. Backend — Cashfree Helper Module

**File:** `server/src/helpers/cashfreeCheckout.ts`

This module wraps all Cashfree PG REST API calls. We use raw `fetch()` instead of Cashfree's Node SDK because the REST API gives us more control and the SDK is less mature.

### 4.1 Configuration

```typescript
const CASHFREE_API_VERSION = "2023-08-01";

function getCashfreeBaseUrl(): string {
  return process.env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}
```

### 4.2 Types

```typescript
export interface CashfreeOrderParams {
  appId: string;
  secretKey: string;
  orderId: string;
  orderAmount: number;          // In RUPEES (not paise!)
  orderCurrency?: string;
  customerDetails: {
    customer_id: string;
    customer_phone?: string;    // MUST be a string
    customer_email?: string;
    customer_name?: string;
  };
  returnUrl?: string;
}

export interface CashfreeOrderResponse {
  cf_order_id: string;          // Cashfree's internal order ID
  order_id: string;             // Our order ID (echoed back)
  payment_session_id: string;   // Token for frontend SDK
  order_status: string;
}
```

### 4.3 createCashfreeOrder()

Creates an order on Cashfree. Returns a `payment_session_id` for the frontend.

```typescript
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
      "x-client-id": params.appId,           // SP's App ID
      "x-client-secret": params.secretKey,    // SP's Secret Key
      "x-api-version": CASHFREE_API_VERSION,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || `Cashfree order creation failed (${response.status})`);
  }
  return data as CashfreeOrderResponse;
}
```

**What the API call looks like:**

```
POST https://sandbox.cashfree.com/pg/orders
Headers:
  Content-Type: application/json
  x-client-id: CF_APP_ID_HERE
  x-client-secret: CF_SECRET_KEY_HERE
  x-api-version: 2023-08-01
Body:
  {
    "order_id": "cf_694bb834_1709312345678",
    "order_amount": 7078.82,
    "order_currency": "INR",
    "customer_details": {
      "customer_id": "69532b2d6aa1b09c438068eb",
      "customer_phone": "8512030121",
      "customer_email": "user@example.com",
      "customer_name": "NANDINI"
    }
  }
```

**Response from Cashfree:**

```json
{
  "cf_order_id": "2388816",
  "order_id": "cf_694bb834_1709312345678",
  "payment_session_id": "session_5xKqZ8...",
  "order_status": "ACTIVE"
}
```

### 4.4 getCashfreeOrderStatus()

Used for **server-side payment verification** after the user completes payment.

```typescript
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
    throw new Error(data?.message || `Failed to fetch Cashfree order (${response.status})`);
  }
  return data;
}
```

**Response when payment is successful:**

```json
{
  "cf_order_id": "2388816",
  "order_id": "cf_694bb834_1709312345678",
  "order_status": "PAID",
  "order_amount": 7078.82,
  "order_currency": "INR"
}
```

### 4.5 getCashfreePaymentsForOrder()

Fetches detailed payment info (method, UTR, etc.) for a completed order.

```typescript
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
    throw new Error(data?.message || `Failed to fetch Cashfree payments (${response.status})`);
  }
  return data;
}
```

---

## 5. Backend — API Routes

**File:** `server/src/routes/PaymentRoutes.ts`

```typescript
import {
  AddCashfreeKeys,
  updateCashfreeKeys,
  getCashfreeKeys,
  // ... existing imports ...
} from "../controllers/PaymentController";

// Cashfree credential CRUD
router.get("/get/cashfreekeys", getCashfreeKeys);
router.post("/add/cashfreekeys", AddCashfreeKeys);
router.post("/update/cashfreekeys", updateCashfreeKeys);

// Existing routes (unchanged)
router.post("/checkout", paymentCheckOut);                    // Modified internally
router.post("/createandverifyorder", createAndVerifyOrder);   // Modified internally
router.get("/get/getsppaymentdetails", getSPPaymentDetails);  // Modified internally
```

---

## 6. Backend — Credential Management (CRUD)

**File:** `server/src/controllers/PaymentController.ts`

### 6.1 AddCashfreeKeys

```typescript
export const AddCashfreeKeys = async (req: Request, res: Response) => {
  const { id, name, email, appId, secretKey } = req.body;

  // 1. Save credentials to CashfreeKeys collection
  const cashfreeKeys = new CashfreeKeyModel({
    appId,
    secretKey,
    userId: id,
    name,
    email,
  });
  const savedKeys = await cashfreeKeys.save();

  // 2. Update SP document: set cashfreeKey ref AND integration preference
  await ServiceProviderRegModel.findByIdAndUpdate(id, {
    cashfreeKey: savedKeys._id,
    "services.integration": "cashfree",    // <-- Sets active gateway
  });

  res.status(200).json({ success: true, data: savedKeys });
};
```

### 6.2 updateCashfreeKeys

```typescript
export const updateCashfreeKeys = async (req: Request, res: Response) => {
  const { _id, appId, secretKey } = req.body;

  const updateResult = await CashfreeKeyModel.findByIdAndUpdate(
    _id,
    { appId, secretKey },
    { new: true }
  );

  if (!updateResult) {
    return res.status(404).json({ success: false, message: "Keys not found" });
  }

  // Update the SP's active integration
  await ServiceProviderRegModel.findByIdAndUpdate(updateResult.userId, {
    "services.integration": "cashfree",
  });

  res.status(200).json({ success: true, data: updateResult });
};
```

### 6.3 getCashfreeKeys

```typescript
export const getCashfreeKeys = async (req: Request, res: Response) => {
  const { id } = req.query;

  const sp = await ServiceProviderRegModel.findById(id).populate("cashfreeKey");
  if (!sp || !sp.cashfreeKey) {
    return res.status(404).json({ success: false, message: "No Cashfree keys found" });
  }

  res.status(200).json({ success: true, data: sp.cashfreeKey });
};
```

> **Note:** AddRazorpayKeys and updateRazorpayKeys were also modified to set
> `"services.integration": "razorpay"` when saving, ensuring the active gateway
> always reflects the last-saved credentials.

---

## 7. Backend — Checkout Controller

**File:** `server/src/controllers/PaymentController.ts` — `paymentCheckOut` function

This is the core branching logic. When a user clicks "Pay", this controller decides which gateway to use.

```typescript
export const paymentCheckOut = async (req: Request, res: Response) => {
  const { amount, spId, buyerId, buyerPhone, buyerEmail, buyerName, ...rest } = req.body;

  // 1. Fetch SP with gateway preference
  const sp = await ServiceProviderRegModel.findById(spId)
    .populate("razorpayKey")
    .populate("cashfreeKey");

  const integration = sp.services?.integration || "razorpay";

  // 2. Branch based on integration type
  if (integration === "cashfree") {
    // ─── CASHFREE FLOW ───
    const cashfreeKeys = await CashfreeKeyModel.findOne({ userId: spId });
    if (!cashfreeKeys) {
      return res.status(400).json({ success: false, message: "Cashfree keys not found" });
    }

    const orderId = `cf_${spId}_${Date.now()}`;
    const orderAmountInRupees = amount / 100;    // Convert paise → rupees

    const cfOrder = await createCashfreeOrder({
      appId: cashfreeKeys.appId,
      secretKey: cashfreeKeys.secretKey,
      orderId,
      orderAmount: orderAmountInRupees,
      customerDetails: {
        customer_id: String(buyerId || `cust_${Date.now()}`),
        customer_phone: String(buyerPhone || "9999999999"),  // Must be string!
        customer_email: String(buyerEmail || ""),
        customer_name: String(buyerName || ""),
      },
    });

    return res.status(200).json({
      success: true,
      gateway: "cashfree",                          // Frontend reads this
      cfOrderId: cfOrder.cf_order_id,
      orderId: cfOrder.order_id,
      paymentSessionId: cfOrder.payment_session_id, // Frontend SDK needs this
    });

  } else {
    // ─── RAZORPAY FLOW (existing) ───
    // ... create Razorpay order using SDK ...
    return res.status(200).json({
      success: true,
      gateway: "razorpay",
      checkout: razorpayOrder,
      razorpayKeyId: razorpayKeys.keyId,
    });
  }
};
```

**Key points:**
- `amount` from frontend is in **paise** (e.g., 707882 = ₹7078.82).
- Cashfree expects amount in **rupees**, so we divide by 100.
- All `customerDetails` fields are wrapped in `String()` — Cashfree rejects numbers.
- The `gateway` field in the response tells the frontend which SDK to use.

---

## 8. Backend — Payment Verification

**File:** `server/src/controllers/PaymentController.ts` — `createAndVerifyOrder` function

After the user completes payment in the modal, the frontend sends payment details to this controller for **server-side verification**.

```typescript
export const createAndVerifyOrder = async (req: Request, res: Response) => {
  const parsedData = JSON.parse(req.body.data);

  const {
    razorpayPaymentId,
    razorpayOrderId,
    razorpaySignature,
    cashfreePaymentId,       // NEW
    cashfreeOrderId,         // NEW
    cashfreeReferenceOrderId, // NEW
    spId,
    // ... other order fields ...
  } = parsedData;

  const isCashfreePayment = !!(cashfreePaymentId || cashfreeOrderId);

  if (isCashfreePayment) {
    // ─── CASHFREE VERIFICATION ───
    const cashfreeKeys = await CashfreeKeyModel.findOne({ userId: spId });
    if (!cashfreeKeys) {
      return res.status(400).json({ success: false, message: "Cashfree keys not found" });
    }

    // Server-to-server API call to verify payment
    const orderStatus = await getCashfreeOrderStatus(
      cashfreeKeys.appId,
      cashfreeKeys.secretKey,
      cashfreeReferenceOrderId   // The order_id we created earlier
    );

    if (orderStatus.order_status !== "PAID") {
      return res.status(400).json({
        success: false,
        message: "Payment not completed on Cashfree",
      });
    }

    // ✅ Payment verified — proceed with order finalization

  } else {
    // ─── RAZORPAY VERIFICATION (existing) ───
    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: "Missing Razorpay fields" });
    }

    const razorpayKeys = await RazorpayKeyModel.findOne({ userId: spId });
    const generatedSignature = crypto
      .createHmac("sha256", razorpayKeys.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // ✅ Signature matches — proceed with order finalization
  }

  // ─── COMMON ORDER FINALIZATION ───
  // - Create Order document in MongoDB
  // - Deduct from wallet / create wallet transaction
  // - Enroll user in the service
  // - Send email confirmation & invoice
  // - Update Telegram channel membership (if applicable)

  const paymentId = cashfreePaymentId || razorpayPaymentId;
  // ... finalization code ...
};
```

### Verification Comparison

| Aspect | Razorpay | Cashfree |
|--------|----------|----------|
| **Method** | Cryptographic (HMAC-SHA256) | API call (server-to-server) |
| **What's verified** | Signature = HMAC of `orderId\|paymentId` using `keySecret` | `order_status === "PAID"` from Cashfree API |
| **Network call needed?** | No (pure computation) | Yes (GET request to Cashfree) |
| **Data from frontend** | `razorpayPaymentId`, `razorpayOrderId`, `razorpaySignature` | `cashfreePaymentId`, `cashfreeOrderId`, `cashfreeReferenceOrderId` |
| **Trust model** | If signature matches, payment is authentic | If Cashfree's API says PAID, payment is authentic |

---

## 9. Frontend — Integrations Page (SP Setup)

**File:** `front/src/app/dashboard/serviceprovider/myprofile/integrations/page.tsx`

### 9.1 Gateway Selection UI

The page shows two selectable cards (Razorpay and Cashfree). The SP clicks one to select it, then fills in their credentials.

```typescript
const [selectedGateway, setSelectedGateway] = useState<GatewayType>("razorpay");
const [activeIntegration, setActiveIntegration] = useState<GatewayType | null>(null);
```

### 9.2 Fetching Active Integration on Load

On page load, we fetch the SP's actual `services.integration` from the backend — this is the source of truth.

```typescript
useEffect(() => {
  const spId = session.data?.user.id;
  if (!spId) return;
  (async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/get/getsppaymentdetails?id=${spId}`
      );
      const json = await res.json();
      const integration = json?.data?.integration;
      if (integration === "cashfree" || integration === "razorpay") {
        setSelectedGateway(integration);
        setActiveIntegration(integration);
      }
    } catch {}
  })();
}, [session.data?.user.id]);
```

### 9.3 Connected Badge Logic

"Connected" only shows on the gateway that is **both** configured AND currently active:

```typescript
const isRazorpayConnected = !!razorpayData?.data?.keyId && activeIntegration === "razorpay";
const isCashfreeConnected = !!cashfreeData?.data?.appId && activeIntegration === "cashfree";
```

### 9.4 Saving Keys

When saving, `activeIntegration` is updated immediately so the badge moves without refresh:

```typescript
async function handleCashfreeSubmit(event) {
  event.preventDefault();
  const res = await fetch(".../api/payment/add/cashfreekeys", {
    method: "POST",
    body: JSON.stringify({ id, name, email, ...cashfreeDetails }),
  });
  if (res.ok) {
    setActiveIntegration("cashfree");  // Badge moves instantly
    toast({ title: "Success", description: "Cashfree keys added" });
  }
}
```

---

## 10. Frontend — Checkout Flow (User Payment)

**File:** `front/src/components/Cart/StepTwo.tsx`

### 10.1 Loading the Cashfree SDK

```tsx
<Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="afterInteractive" />
```

### 10.2 Payment Handler (Dynamic Gateway)

```typescript
const handleGatewayPayment = async () => {
  // 1. Call backend checkout
  const response = await fetch(".../api/payment/checkout", {
    method: "POST",
    body: JSON.stringify({ amount, spId, buyerId, buyerPhone, buyerEmail, buyerName }),
  });
  const data = await response.json();

  if (data.gateway === "cashfree") {
    // ─── CASHFREE CHECKOUT ───
    const cashfree = (window as any).Cashfree;
    if (!cashfree) return;

    // Initialize SDK with sandbox/production mode
    const cf = cashfree({
      mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === "production"
        ? "production"
        : "sandbox"
    });

    // Open checkout modal (Promise-based)
    const result = await cf.checkout({
      paymentSessionId: data.paymentSessionId,
      redirectTarget: "_modal",
    });

    if (result.error) {
      // Payment failed or user cancelled
      console.error(result.error);
      return;
    }

    if (result.paymentDetails) {
      // Payment succeeded — call backend to verify & create order
      await createOrder({
        cashfree: {
          cf_payment_id: result.paymentDetails.paymentMessage,
          cf_order_id: data.cfOrderId,
          order_id: data.orderId,
        },
      });
    }

  } else {
    // ─── RAZORPAY CHECKOUT (existing) ───
    const options = {
      key: data.razorpayKeyId,
      amount: amount,
      order_id: data.checkout.id,
      handler: async function (response: any) {
        await createOrder({
          razorpay: {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          },
        });
      },
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }
};
```

### 10.3 createOrder Function

Sends payment details to backend for verification and order creation:

```typescript
const createOrder = async ({ razorpay, cashfree, paymentProof }: {
  razorpay?: any;
  cashfree?: any;
  paymentProof?: File;
}) => {
  const payload: any = {
    // ... order details (spId, items, amount, etc.) ...
    paymentMode: "gateway",
  };

  if (cashfree) {
    payload.cashfreePaymentId = cashfree.cf_payment_id;
    payload.cashfreeOrderId = cashfree.cf_order_id;
    payload.cashfreeReferenceOrderId = cashfree.order_id;
  } else if (razorpay) {
    payload.razorpayPaymentId = razorpay.razorpay_payment_id;
    payload.razorpayOrderId = razorpay.razorpay_order_id;
    payload.razorpaySignature = razorpay.razorpay_signature;
  }

  const formData = new FormData();
  formData.append("data", JSON.stringify(payload));

  await fetch(".../api/payment/createandverifyorder", {
    method: "POST",
    body: formData,
  });
};
```

### 10.4 Auto-Renewal (Razorpay Only)

Auto-renewal via UPI Auto-Pay is only supported by Razorpay. The toggle is hidden when the gateway is Cashfree:

```tsx
{recurringPaymentEnabled && gatewayType === "razorpay" && (
  <div className="mb-4 p-4 border rounded-xl">
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={autoRenew} onChange={...} />
      <div>
        <p className="font-medium">Enable Auto-Renewal via UPI</p>
      </div>
    </label>
  </div>
)}
```

Similarly, on the **Create Plan page**, the "Renewable" purchase type is disabled when the SP uses Cashfree:

```tsx
<input
  type="radio"
  name="purchaseType"
  value="RENEWABLE"
  disabled={spIntegration === "cashfree"}
/>
{spIntegration === "cashfree" && (
  <p className="text-xs text-amber-600">
    Auto-renewal is only supported with Razorpay.
  </p>
)}
```

---

## 11. Environment Variables

### Backend (`server/.env`)

```env
CASHFREE_ENV=sandbox
# Use "production" when going live
```

This controls the Cashfree API base URL:
- `sandbox` → `https://sandbox.cashfree.com/pg`
- `production` → `https://api.cashfree.com/pg`

### Frontend (`front/.env.local`)

```env
NEXT_PUBLIC_CASHFREE_ENV=sandbox
# Use "production" when going live
```

This controls the Cashfree JS SDK mode:
- `sandbox` → Opens test checkout modal
- `production` → Opens real checkout modal

> **Important:** Both must be set to `production` together when going live.
> Sandbox credentials won't work in production mode and vice versa.

---

## 12. Razorpay vs Cashfree — Key Differences

| Aspect | Razorpay | Cashfree |
|--------|----------|----------|
| **Amount unit** | Paise (₹1 = 100) | Rupees (₹1 = 1) |
| **Backend SDK** | Official Node SDK (`razorpay` npm) | REST API via `fetch()` |
| **Frontend SDK** | `new Razorpay(options).open()` | `Cashfree({ mode }).checkout({ paymentSessionId })` |
| **Frontend pattern** | Callback (`handler: fn`) | Promise (`.then()`) |
| **Frontend needs from backend** | `order_id` + `key_id` | `paymentSessionId` only |
| **Verification method** | HMAC-SHA256 signature check | Server-to-server API call |
| **Signature from frontend?** | Yes (`razorpay_signature`) | No |
| **SP credentials** | `keyId` + `keySecret` | `appId` + `secretKey` |
| **Auto-renewal/Subscriptions** | Supported (UPI Auto-Pay) | Not supported in this flow |
| **Test mode indicator** | "TEST" badge in top-left of modal | Look for sandbox URL in network tab |
| **Sandbox URL** | Handled by SDK based on key type | `https://sandbox.cashfree.com/pg` |
| **Production URL** | Handled by SDK | `https://api.cashfree.com/pg` |
| **API auth headers** | Built into SDK | `x-client-id`, `x-client-secret`, `x-api-version` |

---

## 13. Common Errors & Fixes

### Error 1: `customer_details.customer_phone should be string`

**Cause:** Frontend sent `buyerPhone` as a number (e.g., `8512030121`). Cashfree's API strictly requires strings.

**Fix:** Wrap all customer fields with `String()`:
```typescript
customer_details: {
  customer_id: String(buyerId),
  customer_phone: String(buyerPhone || "9999999999"),
  customer_email: String(buyerEmail || ""),
  customer_name: String(buyerName || ""),
}
```

### Error 2: `Missing Razorpay fields`

**Cause:** After Cashfree payment, the `createAndVerifyOrder` controller only had Razorpay verification logic. Cashfree fields (`cashfreePaymentId`, etc.) were in the payload but the code tried to validate `razorpayPaymentId` which was undefined.

**Fix:** Added `isCashfreePayment` flag and branched verification logic.

### Error 3: `'updateResult' is possibly 'null'`

**Cause:** TypeScript null safety — `CashfreeKeyModel.findByIdAndUpdate()` can return `null` if the document doesn't exist, but the code used `updateResult.userId` without checking.

**Fix:** Added null check before accessing properties:
```typescript
const updateResult = await CashfreeKeyModel.findByIdAndUpdate(...);
if (!updateResult) {
  return res.status(404).json({ success: false, message: "Keys not found" });
}
// Now safe to use updateResult.userId
```

### Error 4: Wrong gateway on page refresh

**Cause:** The integrations page had `useEffect` that always set `selectedGateway("cashfree")` whenever `cashfreeData` existed, regardless of the actual active integration.

**Fix:** Fetch `services.integration` from the backend on mount and use that as the source of truth:
```typescript
const res = await fetch(".../api/payment/get/getsppaymentdetails?id=${spId}");
const integration = json?.data?.integration; // "razorpay" or "cashfree"
setSelectedGateway(integration);
```

---

## 14. Interview-Ready Explanation

> **"Tell me about a payment gateway integration you've done."**

"In our multi-tenant marketplace TradeBox, I integrated Cashfree as an alternative to Razorpay. The challenge was that each Service Provider has their own gateway credentials, so the system needed to dynamically choose the right gateway at checkout time.

**Database layer:** I created a `CashfreeKeys` collection to store per-SP credentials, and added an `integration` field (enum: razorpay | cashfree) to the SP's services schema as the single source of truth.

**Backend:** I wrote a helper module that wraps Cashfree's REST API — `createCashfreeOrder()` to create orders and `getCashfreeOrderStatus()` for server-side verification. The checkout controller checks `sp.services.integration`, fetches the right credentials, and returns a `gateway` field to the frontend.

**Frontend:** Based on the `gateway` response, I dynamically initialize either Razorpay's SDK (callback pattern with `rzp.open()`) or Cashfree's SDK (Promise pattern with `cf.checkout({ paymentSessionId })`). The key insight is that Cashfree uses a `payment_session_id` token that encapsulates the entire order context, while Razorpay requires both `key_id` and `order_id`.

**Verification:** The biggest architectural difference is in verification. Razorpay uses cryptographic verification — an HMAC-SHA256 of `orderId|paymentId` with the `keySecret`, compared against the signature from the frontend. Cashfree doesn't provide a signature; instead, I verify server-to-server by calling their `GET /pg/orders/{id}` endpoint and checking `order_status === 'PAID'`.

**Edge cases I handled:** type strictness (Cashfree requires phone as string, not number), amount conversion (Razorpay uses paise, Cashfree uses rupees), auto-renewal being Razorpay-only, and ensuring the integrations page correctly reflects the active gateway after refresh."

---

## File Reference

| File | Purpose |
|------|---------|
| `server/src/models/IntegrationModels.ts` | CashfreeKeys + RazorpayKeys Mongoose schemas |
| `server/src/models/AuthModels.ts` | ServiceProvider schema with `services.integration` |
| `server/src/helpers/cashfreeCheckout.ts` | Cashfree REST API wrapper (create order, verify) |
| `server/src/controllers/PaymentController.ts` | All payment logic (CRUD, checkout, verification) |
| `server/src/routes/PaymentRoutes.ts` | API route definitions |
| `front/.../integrations/page.tsx` | SP gateway selection + credentials form |
| `front/.../Cart/StepTwo.tsx` | User checkout with dynamic gateway |
| `front/.../Courses/CoursePricingSection.tsx` | Course-specific checkout with dynamic gateway |
| `front/.../services/createplan/page.tsx` | Plan creation with auto-renewal restriction |

---

*End of Document*
