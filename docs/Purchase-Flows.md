# Tradebox Purchase Flows - Technical Documentation

## Table of Contents

- [1. Overview](#1-overview)
- [2. Authentication & KYC Prerequisites](#2-authentication--kyc-prerequisites)
- [3. Flow 1: Service / Portfolio / Package Purchase](#3-flow-1-service--portfolio--package-purchase)
- [4. Flow 2: Course Purchase](#4-flow-2-course-purchase)
- [5. Lead Tracking](#5-lead-tracking)
- [6. API Reference](#6-api-reference)
- [7. Key Differences: Service vs Course Purchase](#7-key-differences-service-vs-course-purchase)
- [8. File Map](#8-file-map)

---

## 1. Overview

### Architecture

```
┌─────────────────────┐        ┌──────────────────────┐       ┌───────────┐
│   Next.js Frontend  │◄──────►│   Express Backend    │◄─────►│  MongoDB  │
│   (front/src/)      │  REST  │   (server/src/)      │       │           │
└────────┬────────────┘        └──────────┬───────────┘       └───────────┘
         │                                │
         │                     ┌──────────┼──────────┐
         │                     │          │          │
      NextAuth            Razorpay    Cashfree   Surepass
      (JWT Auth)          (Payment)   (Payment)  (eSign)
```

### Two Purchase Flows at a Glance

| Aspect | Service / Portfolio / Package | Course |
|--------|------------------------------|--------|
| KYC Required | Yes (PAN + Email) | No (Name + Email only) |
| eSign Required | Yes (T&C signing via Surepass) | No |
| Checkout Page | `/checkout` (2-step) | Inline on course page |
| Payment Endpoint | `POST /api/payment/checkout` | `POST /api/payment/checkoutrzp` |
| Order Endpoint | `POST /api/payment/createandverifyorder` | `POST /api/payment/createandenroll` |
| Manual Payment | Supported | Not supported |
| Auto-Renewal | Supported (Razorpay subscriptions) | Not supported |
| Coupon Support | Yes | No |
| Post-Purchase Redirect | `/view/services|portfolio|packages/{id}` | `/view/learn/{courseId}` |

### Key Terminology

| Term | Description |
|------|-------------|
| **SP** | Service Provider - the entity selling services/portfolios/packages/courses |
| **KYC** | Know Your Customer - PAN verification + email collection |
| **eSign** | Electronic signature on Terms & Conditions via Surepass |
| **Lead** | A tracked user journey through the purchase funnel |
| **Gateway Payment** | Payment via Razorpay or Cashfree payment gateway |
| **Manual Payment** | Payment via bank transfer with proof upload |

---

## 2. Authentication & KYC Prerequisites

Authentication and KYC are shared prerequisites used by both purchase flows. The behavior differs based on the `mode` query parameter.

### 2.1 Auth Modes

| Mode | URL Parameter | When Used | PAN Step |
|------|--------------|-----------|----------|
| **KYC** | `?mode=kyc` | Service/Portfolio/Package purchase | Required during signup |
| **Learning** | `?mode=learning` | Course purchase | Skipped |

### 2.2 Registration Flow (New User)

**Component**: `front/src/components/Auth/user/UserSignInContainer.tsx`

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  STEP 1:     │     │  STEP 2:     │     │  STEP 3:     │     │  STEP 4:     │
│  MOBILE      │────►│  OTP         │────►│  PAN         │────►│  DETAILS     │
│  Enter phone │     │  4-digit OTP │     │  (kyc mode   │     │  Name +      │
│  number      │     │  60s resend  │     │   only)      │     │  Email       │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

#### Step 1: Phone Number

User enters their 10-digit mobile number.

**API Call:**
```
POST /api/auth/requestoptformobile
Content-Type: application/json

{
  "number": "9876543210",
  "role": "user"
}

Response:
{
  "success": true,
  "existsAs": null | "user" | "provider" | "admin"
}
```

- If `existsAs` is a role other than `"user"`, the signup is blocked with a message directing the user to sign in from the respective page.

#### Step 2: OTP Verification

User enters the 4-digit OTP received via SMS. OTP inputs auto-focus to the next field. A resend timer of 60 seconds prevents spam.

**API Call:**
```
POST /api/auth/checkotpnumber
Content-Type: application/json

{
  "number": "9876543210",
  "otp": "1234"
}

Response:
{
  "success": true,
  "userExists": true | false,
  "role": "user" | "provider" | "admin"
}
```

**Branching logic after OTP verification:**

- **Existing user (`userExists: true`, `role: "user"`)**: Signs in via NextAuth credentials and redirects to `callbackUrl`.
- **New user**: Automatically creates account with phone number only via `signupUser()`, signs in, and redirects to `callbackUrl`. The PAN and details steps are skipped during login (they are handled later by the KYC modal during purchase).

#### Step 3: PAN Verification (KYC mode only)

This step only appears when `mode=kyc`. User enters PAN in format `ABCDE1234F`.

**API Call:**
```
POST /api/verifyPan
Content-Type: application/json

{
  "panNumber": "ABCDE1234F"
}

Response (PanData):
{
  "success": true,
  "data": {
    "status": "valid",
    "full_name": "JOHN DOE",
    "dob": "1990-01-15",
    "gender": "M",
    "pan_number": "ABCDE1234F",
    "masked_aadhaar": "XXXX XXXX 1234"
  }
}
```

- The user's name is auto-populated from PAN data in the next step.

#### Step 4: Name & Email

User enters/confirms their name (pre-filled from PAN if available) and email address.

**API Call (signup):**
```
POST /api/auth/user/signup
Content-Type: application/json

{
  "number": "9876543210",
  "mode": "kyc",
  "name": "JOHN DOE",
  "email": "john@example.com",
  "pannumber": "ABCDE1234F",
  "dob": "1990-01-15",
  "gender": "M",
  "aadhaarLast4": "1234"
}
```

After signup, NextAuth `signIn("credentials")` is called and the user is redirected to `callbackUrl`.

### 2.3 KYC Modal (Registered User, Missing KYC)

**Component**: `front/src/components/Modal/PurchaseKycModal.tsx`

When a logged-in user clicks "Purchase Now" but is missing KYC data (no `RegName`, `email`, or `pannumber`), the `PurchaseKycModal` opens.

```
┌──────────────────┐     ┌──────────────────┐
│  Step 1: PAN     │────►│  Step 2: EMAIL   │
│  Verify PAN      │     │  Enter email     │
│  number          │     │  Name shown from │
│                  │     │  PAN data        │
└──────────────────┘     └──────────────────┘
```

**KYC check function** (`needsKyc()` in PricingSection.tsx):
```typescript
const needsKyc = () => {
  const user = session?.data?.user;
  if (!user) return false;
  return !user.RegName || !user.email || !user.pannumber;
};
```

**Step 1 - PAN Verification:**
```
POST /api/verifyPan
{ "panNumber": "ABCDE1234F" }
```

**Step 2 - Save KYC:**
```
PATCH /api/updateprofile/user/kyc
Content-Type: application/json

{
  "id": "user_id",
  "name": "JOHN DOE",
  "email": "john@example.com",
  "pannumber": "ABCDE1234F",
  "dob": "1990-01-15",
  "gender": "M",
  "aadhaarLast4": "1234"
}
```

After KYC completion, the NextAuth session is updated with `RegName`, `email`, and `pannumber`, then the purchase proceeds.

### 2.4 Course Details Modal (Missing Name/Email)

**Component**: `front/src/components/Modal/CourseDetailsModal.tsx`

Simpler than KYC - only collects name and email (no PAN required).

```
┌──────────────────────┐
│  Enter Full Name     │
│  Enter Email         │
│  [Save & Proceed]    │
└──────────────────────┘
```

**API Call:**
```
PATCH /api/updateprofile/user/kyc
{
  "id": "user_id",
  "name": "John Doe",
  "email": "john@example.com"
}
```

After saving, the session is updated and the payment flow continues with the provided name and email as overrides.

### 2.5 Session Storage: `pending_cart`

When an unauthenticated user clicks "Purchase Now" on a service page:

1. The cart item is built and saved to `sessionStorage` under key `pending_cart`
2. User is redirected to `/auth/user/signin?mode=kyc&callbackUrl={currentPath}`
3. After successful login, the `callbackUrl` brings the user back to the service page
4. The `PricingSection` component detects the session and restores the cart from `pending_cart`
5. The user can then proceed to checkout

---

## 3. Flow 1: Service / Portfolio / Package Purchase

### 3.1 End-to-End Flow Diagram

```
User lands on /view/services/[id] or /view/portfolio/[id] or /view/packages/[id]
                    │
                    ▼
            ┌──[Logged in?]──┐
            │  NO            │  YES
            ▼                ▼
    Save pending_cart    ┌──[Has KYC?]──┐
    to sessionStorage    │  NO          │  YES
    Redirect to          ▼              ▼
    /auth/user/signin   KYC Modal   ┌──[Has existing order?]──┐
    ?mode=kyc           (PAN+Email) │  YES                    │  NO
            │               │      ▼                          ▼
            │               │   ┌──[ONE_TIME?]──┐         Select Plan
            │               │   │  YES          │  NO     Accept T&C
            │               │   ▼               ▼         Click Purchase
            │               │  BLOCKED      Show Renewal
            │               │  (already     UI ("Renew Now")
            │               │   purchased)      │
            └───────┬───────┴───────────────────┘
                    │
                    ▼
            Add to Redux cart
            Lead: "added_to_cart"
            Redirect to /checkout
                    │
                    ▼
          ┌─────────────────────┐
          │  STEP 1: eSign      │
          │  View T&C document  │
          │  Click "Continue    │
          │  to eSign"          │
          │  → Surepass redirect│
          │  Return: ?esign=    │
          │  success            │
          └─────────┬───────────┘
                    │
                    ▼
          ┌─────────────────────┐
          │  STEP 2: Payment    │
          │                     │
          │  ┌─[Gateway?]──┐   │
          │  │ YES         │NO │
          │  ▼             ▼   │
          │ Razorpay/   Manual  │
          │ Cashfree    Bank    │
          │ modal       transfer│
          │  │          + proof │
          │  │          upload  │
          │  └─────┬────┘      │
          └────────┼───────────┘
                   │
                   ▼
          POST /api/payment/
          createandverifyorder
                   │
                   ▼
          Lead: "payment_success"
          Clear cart
          Redirect to /view/{type}/{id}
```

### 3.2 Landing Pages & Data Fetching

| Type | Page Path | API Endpoint |
|------|-----------|-------------|
| Service | `/view/services/[id]` | `GET /api/data/viewpmsservicedetails?id={id}` |
| Portfolio | `/view/portfolio/[id]` | `GET /api/portfolio/get-portfolio-by-id?id={id}` |
| Package | `/view/packages/[id]` | `GET /api/data/viewpackagedetails?id={id}` |

Each page renders a `PricingSection` component (or `PortfolioPricingSection` / `PackagePricingSection`) that handles the purchase initiation.

### 3.3 User Decision Paths

#### Path A: Unregistered User

1. User lands on service/portfolio/package page (not logged in)
2. Selects a pricing plan and accepts T&C checkbox
3. Clicks "Login to Purchase"
4. `buildCartItem()` creates the cart item and saves to `sessionStorage` as `pending_cart`
5. Redirects to `/auth/user/signin?mode=kyc&callbackUrl={currentPath}`
6. User completes registration (see [Section 2.2](#22-registration-flow-new-user))
7. After login, redirected back to the service page via `callbackUrl`
8. Cart is restored from `pending_cart` and user proceeds to checkout

#### Path B: Registered User (Missing KYC)

1. User is logged in but missing `RegName`, `email`, or `pannumber`
2. Selects a pricing plan and accepts T&C checkbox
3. Clicks "Purchase Now"
4. `needsKyc()` returns `true` → `PurchaseKycModal` opens
5. User completes PAN verification + email entry (see [Section 2.3](#23-kyc-modal-registered-user-missing-kyc))
6. On completion, `proceedToCart()` is called automatically
7. Cart is populated and user redirected to `/checkout`

#### Path C: Registered User (Complete KYC)

1. User is logged in with all KYC data present
2. Selects a pricing plan and accepts T&C checkbox
3. Clicks "Purchase Now"
4. `proceedToCart()` called directly
5. Cart is populated and user redirected to `/checkout`

### 3.4 Plan Selection & Cart Building

**Component**: `front/src/components/service-page/PricingSection.tsx`

#### Pricing Plans

Services can have multiple pricing plans with different validity periods and prices:

```typescript
interface PricingPlan {
  validity: number;       // in days
  price: number;          // base price in INR
  purchaseType?: "ONE_TIME" | "RENEWABLE";
}
```

#### Purchase Type Rules

- **RENEWABLE**: User can purchase again after expiry (shows "Renew Now" if active order exists)
- **ONE_TIME**: User can only purchase once (blocked if order exists for this tier)

#### Cart Item Structure

Built by `buildCartItem()`:

```typescript
{
  title: "Service Name",
  author: "Provider Name",
  authorId: "sp_id",
  authorName: "Provider Name",
  tncFileURL: "https://...",
  bannerURL: "https://...",

  basePrice: 4999,
  gstAmount: 899.82,        // 18% GST if SP has GST
  totalPrice: 5898.82,
  isGST: true,

  validity: 30,             // days
  subscribedToId: "service_id",
  serviceId: "service_id",
  type: "service",           // or "portfolio" or "package"

  planPurchaseType: "RENEWABLE",
  isRenewal: false,
  previousOrderId: null,
  marketplaceSlug: undefined  // present only for marketplace orders
}
```

#### GST Calculation

- GST (18%) is applied **only if** the service provider has a GST number (`spData.gst` is truthy)
- `gstAmount = basePrice * 0.18`
- `totalPrice = basePrice + gstAmount`

#### T&C Checkbox

User must check the "I accept Terms & Conditions" checkbox before purchasing. Without it, a toast error appears: "Please accept the terms and conditions."

### 3.5 Checkout Page

**Page**: `front/src/app/checkout/page.tsx`

The checkout page is a 2-step process orchestrated by the `CheckoutPage` component.

#### Cart Guard

On mount, if no cart item exists in Redux, the user is redirected to `/` (home page).

#### Lead Tracking

On mount, tracks `"checkout_started"` lead status.

#### eSign Resume Logic

The checkout page handles two eSign resume scenarios:

1. **Existing eSign session**: On mount, checks `GET /api/esign/session?serviceId={id}&userId={id}`. If a completed session with `signedDocURL` exists, auto-skips to Step 2.

2. **Return from Surepass redirect**: Detects `?esign=success` query parameter, reads `pending_esign` from sessionStorage, verifies the eSign session via API, updates Redux with `signedDocURL`, and advances to Step 2.

### 3.6 Checkout Step 1: eSign (T&C Agreement)

**Component**: `front/src/components/Cart/StepOne.tsx`

#### T&C Document Display

The T&C PDF document is displayed in an iframe:
```html
<iframe src="{tncFileURL}#toolbar=0&navpanes=0" />
```

#### eSign Initialization

When user clicks "Continue to eSign":

**API Call:**
```
POST /api/esign/init
Content-Type: application/json

{
  "userId": "user_id",
  "serviceId": "service_id",
  "tncFileURL": "https://s3.../tnc.pdf",
  "fullName": "JOHN DOE",
  "mobile": "9876543210",
  "email": "john@example.com"
}

Response:
{
  "token": "esign_token_xxx",
  "clientId": "client_id_xxx"
}
```

#### Surepass Redirect

After successful initialization:

1. Resume context saved to `sessionStorage` as `pending_esign`:
   ```json
   {
     "clientId": "client_id_xxx",
     "serviceId": "service_id",
     "initiatedAt": 1711900000000
   }
   ```

2. Lead status tracked: `"esign_started"`

3. Full-page redirect to: `https://esign-client.surepass.app/?token={token}`

4. User signs the document on Surepass platform

#### Resume After eSign

When user returns to `/checkout?esign=success`:

1. `pending_esign` is read from sessionStorage
2. eSign session is verified:

```
GET /api/esign/session?serviceId={service_id}&userId={user_id}

Response:
{
  "data": {
    "signedDocURL": "https://s3.../signed_doc.pdf",
    "status": "COMPLETED"
  }
}
```

3. Redux updated: `step2Data.signedDocURL` and `step2Data.isEsignCompleted = true`
4. Lead status tracked: `"esign_completed"`
5. `pending_esign` removed from sessionStorage
6. URL cleaned to `/checkout` (removes query params)
7. Step auto-advances to Step 2

### 3.7 Checkout Step 2: Payment

**Component**: `front/src/components/Cart/StepTwo.tsx`

#### Payment Configuration Fetch

On mount, the payment configuration for the service provider is fetched:

```
GET /api/payment/get/paymentdetails?id={spId}

Response:
{
  "data": {
    "type": "gateway" | "manual",
    "gateway": "razorpay" | "cashfree",
    "recurringPaymentEnabled": true | false,
    "paymentDetails": {                    // only if type === "manual"
      "bankName": "HDFC Bank",
      "beneficiaryName": "Provider Name",
      "accNumber": "1234567890",
      "ifsc": "HDFC0001234",
      "upi": "provider@upi",
      "qrCode": "https://s3.../qr.png"
    }
  }
}
```

This determines whether the user sees gateway payment (Razorpay/Cashfree modal) or manual payment (bank details + proof upload).

#### Mode A: Gateway Payment (Razorpay / Cashfree)

##### 1. Apply Coupon (Optional)

```
POST /api/services/applycoupon
Content-Type: application/json

{
  "serviceId": "service_id",
  "couponCode": "SAVE20",
  "price": 4999
}

Response (success):
{
  "discountedPrice": 3999,
  "coupon": {
    "id": "coupon_id",
    "code": "SAVE20",
    "type": "percentage" | "fixed",
    "value": 20
  }
}
```

The coupon can be removed to restore the original price.

##### 2. Auto-Renewal Toggle (Optional)

Available only when:
- `recurringPaymentEnabled` is `true` for the SP
- `gatewayType` is `"razorpay"` (Cashfree doesn't support subscriptions)

When enabled, creates a Razorpay subscription instead of a one-time order.

##### 3. Initialize Payment

```
POST /api/payment/checkout
Content-Type: application/json

{
  "amount": 589882,              // total in paise (amount * 100)
  "spId": "sp_id",
  "buyerId": "user_id",
  "buyerPhone": "9876543210",
  "buyerEmail": "john@example.com",
  "buyerName": "JOHN DOE",
  "autoRenew": false,            // optional
  "serviceName": "Service Name", // optional, when autoRenew
  "validity": "30",              // optional, when autoRenew
  "type": "service"              // optional, when autoRenew
}
```

Lead status tracked: `"payment_initiated"`

**Razorpay Response (one-time):**
```json
{
  "gateway": "razorpay",
  "razorpayKeyId": "rzp_xxx",
  "checkout": {
    "id": "order_xxx",
    "amount": 589882,
    "currency": "INR"
  }
}
```

**Razorpay Response (subscription/auto-renewal):**
```json
{
  "gateway": "razorpay",
  "isSubscription": true,
  "razorpayKeyId": "rzp_xxx",
  "subscriptionId": "sub_xxx",
  "razorpayPlanId": "plan_xxx"
}
```

**Cashfree Response:**
```json
{
  "gateway": "cashfree",
  "paymentSessionId": "session_xxx",
  "cfOrderId": "cf_order_xxx",
  "orderId": "order_xxx"
}
```

##### 4. Payment Modal

**Razorpay** - Opens the Razorpay checkout modal:
```javascript
{
  key: razorpayKeyId,
  amount: checkout.amount,
  currency: "INR",
  name: cartItem.title,
  order_id: checkout.id,           // or subscription_id for auto-renewal
  prefill: { name, email },
  theme: { color: "#01E3A1" },
  handler: (response) => { ... }   // called on success
}
```

Handler receives:
```json
{
  "razorpay_payment_id": "pay_xxx",
  "razorpay_order_id": "order_xxx",
  "razorpay_signature": "signature_xxx"
}
```

For subscriptions, also receives: `razorpay_subscription_id`

**Cashfree** - Opens the Cashfree modal:
```javascript
{
  paymentSessionId: data.paymentSessionId,
  redirectTarget: "_modal"
}
```

Handler receives:
```json
{
  "paymentDetails": {
    "paymentMessage": "payment_message_xxx"
  }
}
```

On payment modal dismissal, lead status is tracked as `"payment_failed"`.

#### Mode B: Manual Payment (Bank Transfer)

When the SP has `type: "manual"` payment configuration:

1. **Bank Details Displayed**: Bank name, beneficiary name, account number, IFSC code, UPI ID
2. **QR Code**: If available, a scannable QR code for UPI payment
3. **Payment Proof Upload**: User uploads a receipt (image or PDF, accepts `image/*, application/pdf`)
4. **Submit**: Clicking "Confirm Order" calls `createOrder({ paymentProof })` with the uploaded file

### 3.8 Order Creation & Verification

After payment (gateway or manual), the order is created:

```
POST /api/payment/createandverifyorder
Content-Type: multipart/form-data

FormData:
  - "data": JSON string (see payload below)
  - "paymentProof": File (optional, for manual payments only)
```

**Payload (JSON stringified in `data` field):**
```json
{
  "subscribedToId": "service_id",
  "orderById": "user_id",
  "serviceName": "Service Name",
  "orderByName": "JOHN DOE",
  "orderByEmail": "john@example.com",
  "soldById": "sp_id",
  "soldByName": "Provider Name",

  "subtotal": 4999,
  "gst": 899.82,
  "total": 5898.82,
  "coupon": {
    "id": "coupon_id",
    "code": "SAVE20",
    "type": "percentage",
    "value": 20
  },
  "discountAmount": 1000,
  "validity": 30,
  "signedDocumentUrl": "https://s3.../signed_doc.pdf",
  "isGST": true,
  "isRenewal": false,

  "kycDocuments": null,
  "kycCompleted": false,

  "razorpayPaymentId": "pay_xxx",
  "razorpayOrderId": "order_xxx",
  "razorpaySignature": "signature_xxx",
  "razorpaySubscriptionId": "sub_xxx",
  "razorpayPlanId": "plan_xxx",
  "autoRenew": false,

  "cashfreePaymentId": "cf_payment_xxx",
  "cashfreeOrderId": "cf_order_xxx",
  "cashfreeReferenceOrderId": "order_xxx",

  "type": "service",
  "paymentMode": "gateway",
  "marketplaceSlug": "brand-name"
}
```

**On Success:**
- Lead status: `"payment_success"`
- Redux cart cleared
- Toast: "Order placed successfully"
- Redirect to `/view/services/{subscribedToId}` (or `/view/portfolio/` or `/view/packages/` based on type)

**On Failure:**
- Lead status: `"payment_failed"`
- Toast: "Unable to complete order"

#### Marketplace Orders

For marketplace purchases (`cartItem.marketplaceSlug` present), a different endpoint is used:

```
POST /api/payment/createandverifyordermarketplace
```

Same payload structure with the addition of `marketplaceSlug` field.

### 3.9 Renewal Flow

**Detection**: When a logged-in user views a service page, the app checks for existing orders:

```
GET /api/payment/user-order/{serviceId}?userId={user_id}&validityDays={days}
Authorization: Bearer {backendToken}

Response (if order exists):
{
  "success": true,
  "order": {
    "_id": "order_id",
    "serviceName": "Service Name",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "validity": "30",
    "isExpired": false,
    "daysRemaining": 15,
    "isRenewed": false,
    "paymentStatus": "verified"
  }
}
```

**UI Behavior:**
- **RENEWABLE tier with active order**: Shows "Active Subscription" card with expiry info + "Renew Now" button
- **ONE_TIME tier with active order**: Purchase blocked with toast "You have already purchased this validity option"

**Renewal Process:**
Same as regular purchase but with `isRenewal: true` and `previousOrderId: "order_id"` in the cart item.

### 3.10 One-Time Purchase Blocking

```typescript
const isOneTimeBlocked = !isRenewableTier && hasOrderForThisTier;
```

If `purchaseType === "ONE_TIME"` and the user already has an order for this pricing tier, the "Purchase Now" button shows a toast error and blocks the purchase.

---

## 4. Flow 2: Course Purchase

### 4.1 End-to-End Flow Diagram

```
User lands on /view/courses/[courseId]
                    │
                    ▼
         Fetch course details
         GET /api/v1/courses/{courseId}/public
                    │
                    ▼
         Check enrollment status
         GET /api/payment/enrollment/check
         ?courseId={courseId}&userId={userId}
                    │
                    ▼
            ┌──[Enrolled?]──┐
            │  YES          │  NO
            ▼               ▼
        "Go to         ┌──[Logged in?]──┐
         Course"       │  NO            │  YES
         button        ▼                ▼
                   Redirect to     ┌──[Has name & email?]──┐
                   /auth/user/     │  NO                   │  YES
                   signin          ▼                       ▼
                   ?mode=learning  CourseDetailsModal    handlePayment()
                       │           (Name + Email)            │
                       │               │                     │
                       └───────────────┴─────────────────────┘
                                       │
                                       ▼
                              POST /api/payment/checkoutrzp
                              Create Razorpay/Cashfree order
                                       │
                                       ▼
                              ┌──[Gateway type?]──┐
                              │  razorpay         │  cashfree
                              ▼                   ▼
                          Razorpay            Cashfree
                          modal               modal
                              │                   │
                              └─────────┬─────────┘
                                        │
                                        ▼
                              POST /api/payment/createandenroll
                              Create order + enroll user
                                        │
                                        ▼
                              Toast: "Payment successful"
                              Redirect to /view/learn/{courseId}
```

### 4.2 Landing Page & Data Fetching

**Page**: `front/src/app/view/courses/[courseId]/page.tsx`

**API Calls on page load:**

```
GET /api/v1/courses/{courseId}/public

Response: Course details including title, description, price,
          curriculum, instructor info, etc.
```

```
GET /api/payment/enrollment/check?courseId={courseId}&userId={userId}

Response:
{
  "enrolled": true | false
}
```

If enrolled, a "Go to Course" button is shown instead of the purchase button.

### 4.3 User Decision Paths

#### Not Logged In

Clicking "Sign in to Purchase" redirects to:
```
/auth/user/signin?mode=learning&callbackUrl={currentPath}
```

The `mode=learning` parameter skips the PAN verification step during registration.

#### Missing Name or Email

**Check function** (`needsDetails()` in CoursePricingSection.tsx):
```typescript
const needsDetails = () => {
  if (!session?.user) return false;
  const name = user.RegName || user.name || "";
  const email = user.email || "";
  return !name.trim() || !email.trim();
};
```

If details are missing, the `CourseDetailsModal` opens to collect name and email (see [Section 2.4](#24-course-details-modal-missing-nameemail)).

After saving, `handlePayment()` is called with the name/email as overrides, so the payment continues immediately without requiring a page refresh.

#### Ready to Purchase

`handlePayment()` is called directly.

### 4.4 Payment: Checkout

**API Call:**
```
POST /api/payment/checkoutrzp
Content-Type: application/json

{
  "amount": 499,                    // course price in INR (NOT paise)
  "spId": "instructor_id",
  "courseId": "course_id",
  "buyerId": "user_id",
  "buyerPhone": "9876543210",
  "buyerEmail": "john@example.com",
  "buyerName": "John Doe"
}
```

**Razorpay Response:**
```json
{
  "gateway": "razorpay",
  "razorpayKeyId": "rzp_xxx",
  "checkout": {
    "id": "order_xxx",
    "amount": 49900,
    "currency": "INR"
  }
}
```

**Cashfree Response:**
```json
{
  "gateway": "cashfree",
  "paymentSessionId": "session_xxx",
  "cfOrderId": "cf_order_xxx",
  "orderId": "order_xxx"
}
```

#### Razorpay Modal

```javascript
{
  key: razorpayKeyId,
  amount: checkout.amount,
  currency: checkout.currency || "INR",
  name: course.title,
  description: "Payment for course {title}",
  image: course.instructor?.profileUrl,
  order_id: checkout.id,
  prefill: { name, email },
  notes: { courseId, instructorId },
  theme: { color: "#01E3A1" }
}
```

#### Cashfree Modal

```javascript
{
  paymentSessionId: data.paymentSessionId,
  redirectTarget: "_modal"
}
```

### 4.5 Enrollment & Order Creation

After successful payment:

```
POST /api/payment/createandenroll
Content-Type: application/json

{
  "courseId": "course_id",
  "orderById": "user_id",
  "orderByName": "John Doe",
  "orderByEmail": "john@example.com",
  "soldById": "instructor_id",
  "soldByName": "Instructor Name",
  "subtotal": 499.00,
  "gst": 89.82,
  "total": 588.82,
  "validity": 0,
  "isGST": false,

  // Razorpay fields (if Razorpay gateway)
  "razorpayPaymentId": "pay_xxx",
  "razorpayOrderId": "order_xxx",
  "razorpaySignature": "signature_xxx",

  // Cashfree fields (if Cashfree gateway)
  "cashfreePaymentId": "payment_message_xxx",
  "cashfreeOrderId": "cf_order_xxx"
}
```

**Backend Processing:**
1. Idempotency check (prevents duplicate orders for same `razorpayPaymentId`)
2. Validates buyer and course exist
3. Calculates revenue split based on instructor's `lmsCommercial.commissionPercentage`
4. Creates `CourseOrder` record
5. Creates `Enrollment` record
6. Updates user's enrolled courses array
7. Creates `WalletTransaction` and credits instructor's wallet
8. Sends order confirmation email to buyer (CC instructor)

**On Success:**
- Toast: "Payment successful - You're enrolled!"
- Redirect to `/view/learn/{courseId}`

**On Failure:**
- Toast: "Payment succeeded but we couldn't enroll you. Contact support."

---

## 5. Lead Tracking

**Utility**: `front/src/lib/updateLead.ts`

Tracks user progress through the purchase funnel for services, portfolios, and packages.

**API Call:**
```
PATCH /api/payment/leads/update
Authorization: Bearer {backendToken}
Content-Type: application/json

{
  "serviceId": "service_id",
  "status": "checkout_started",
  "type": "service"              // or "portfolio"
}
```

### Tracked Statuses

| Status | When Triggered | Component |
|--------|---------------|-----------|
| `added_to_cart` | User clicks "Purchase Now" and cart is populated | PricingSection.tsx |
| `checkout_started` | Checkout page loads | checkout/page.tsx |
| `esign_started` | eSign initialization begins (before Surepass redirect) | StepOne.tsx |
| `esign_completed` | eSign session verified as completed | checkout/page.tsx |
| `payment_initiated` | Payment gateway opened or manual payment submitted | StepTwo.tsx |
| `payment_success` | Order created successfully | StepTwo.tsx |
| `payment_failed` | Payment modal dismissed or order creation failed | StepTwo.tsx |

> **Note:** Course purchases do not use lead tracking.

---

## 6. API Reference

### Authentication APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/requestoptformobile` | No | Request OTP to phone number |
| POST | `/api/auth/checkotpnumber` | No | Verify OTP code |
| POST | `/api/auth/user/signup` | No | Register new user |
| POST | `/api/auth/signin` | No | Sign in (NextAuth credentials) |

### KYC / Profile APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/verifyPan` | No | Verify PAN number via Surepass |
| PATCH | `/api/updateprofile/user/kyc` | Yes | Update user KYC info (name, email, PAN, DOB, etc.) |

### eSign APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/esign/init` | No | Initialize eSign session with Surepass |
| GET | `/api/esign/session` | No | Get eSign session status and signed doc URL |
| GET | `/api/esign/status` | No | Check eSign status |
| GET | `/api/esign/callback` | No | Handle Surepass callback redirect |
| GET | `/api/esign/getsigneddoc` | No | Retrieve signed document |

### Payment APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payment/get/paymentdetails` | No | Get SP payment config (gateway/manual) |
| POST | `/api/payment/checkout` | No | Create Razorpay/Cashfree order (uses SP's keys) |
| POST | `/api/payment/checkoutrzp` | No | Create payment order for courses (uses platform keys) |
| POST | `/api/payment/createandverifyorder` | No | Verify payment + create service order |
| POST | `/api/payment/createandverifyordermarketplace` | No | Verify payment + create marketplace order |
| POST | `/api/payment/createandenroll` | No | Verify payment + create course order + enroll |
| POST | `/api/payment/verify-manual-payment` | Yes | Admin: verify manual bank transfer |
| GET | `/api/payment/user-order/{serviceId}` | Yes | Check existing order for a service tier |

### Coupon API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/services/applycoupon` | No | Apply coupon code to service purchase |

### Lead Tracking API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PATCH | `/api/payment/leads/update` | Yes | Update lead funnel status |

### Data Fetching APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/data/viewpmsservicedetails` | No | Fetch service details |
| GET | `/api/portfolio/get-portfolio-by-id` | No | Fetch portfolio details |
| GET | `/api/data/viewpackagedetails` | No | Fetch package details |
| GET | `/api/v1/courses/{courseId}/public` | No | Fetch course details |
| GET | `/api/payment/enrollment/check` | No | Check course enrollment status |
| GET | `/api/data/spdetails` | No | Fetch service provider details |

---

## 7. Key Differences: Service vs Course Purchase

| Aspect | Service/Portfolio/Package | Course |
|--------|--------------------------|--------|
| **Auth Mode** | `?mode=kyc` | `?mode=learning` |
| **KYC Required** | PAN + Email (PurchaseKycModal) | Name + Email only (CourseDetailsModal) |
| **PAN Verification** | Required | Not required |
| **eSign (T&C)** | Required (Step 1 of checkout) | Not required |
| **Checkout Page** | Dedicated `/checkout` with 2 steps | Inline on course page |
| **Payment Endpoint** | `POST /api/payment/checkout` | `POST /api/payment/checkoutrzp` |
| **Razorpay Keys Used** | SP's own Razorpay/Cashfree keys | Platform-level Razorpay keys |
| **Amount Format** | Sent in paise (amount * 100) | Sent in INR (rounded) |
| **Order Endpoint** | `POST /api/payment/createandverifyorder` | `POST /api/payment/createandenroll` |
| **Order Format** | FormData (supports file upload) | JSON |
| **Manual Payment** | Supported (bank transfer + proof) | Not supported |
| **Coupon Codes** | Supported | Not supported |
| **Auto-Renewal** | Supported (Razorpay subscriptions) | Not supported |
| **Renewal Flow** | Supported (isRenewal flag) | Not applicable |
| **One-Time Block** | Supported (ONE_TIME purchaseType) | Not applicable |
| **Lead Tracking** | Full funnel tracking | Not tracked |
| **Revenue Split** | N/A (SP receives full payment) | Commission-based split (Tradebox + Instructor) |
| **Post-Purchase** | Redirect to service/portfolio/package page | Redirect to `/view/learn/{courseId}` |
| **Cart System** | Redux store (`cartSlice`) | No cart (direct payment) |
| **State Persistence** | `sessionStorage` (pending_cart, pending_esign) | No persistence needed |

---

## 8. File Map

### Frontend Files

| File | Purpose |
|------|---------|
| **Pages** | |
| `front/src/app/view/services/[id]/page.tsx` | Service detail page |
| `front/src/app/view/portfolio/[id]/page.tsx` | Portfolio detail page |
| `front/src/app/view/packages/[id]/page.tsx` | Package detail page |
| `front/src/app/view/courses/[courseId]/page.tsx` | Course detail page |
| `front/src/app/view/learn/[courseId]/page.tsx` | Course learning page (post-enrollment) |
| `front/src/app/checkout/page.tsx` | 2-step checkout orchestration |
| `front/src/app/checkout/OrderSummary.tsx` | Order summary sidebar component |
| `front/src/app/auth/user/signin/page.tsx` | User sign-in page |
| **Purchase Components** | |
| `front/src/components/service-page/PricingSection.tsx` | Service purchase entry: plan selection, cart building, KYC check |
| `front/src/components/Courses/CoursePricingSection.tsx` | Course purchase: payment + enrollment |
| `front/src/components/Cart/StepOne.tsx` | Checkout Step 1: eSign flow |
| `front/src/components/Cart/StepTwo.tsx` | Checkout Step 2: Payment (gateway + manual) |
| **Modals** | |
| `front/src/components/Modal/PurchaseKycModal.tsx` | KYC modal: PAN verification + email |
| `front/src/components/Modal/CourseDetailsModal.tsx` | Course details: name + email collection |
| **Auth** | |
| `front/src/components/Auth/user/UserSignInContainer.tsx` | User registration: phone, OTP, PAN, details |
| `front/src/app/api/auth/[...nextauth]/options.ts` | NextAuth configuration (JWT, credentials) |
| **State Management** | |
| `front/src/store/slices/cartSlice.ts` | Redux: cart items (addToCart, removeFromCart, clearCart) |
| `front/src/store/slices/cartStepSlice.ts` | Redux: checkout step data (eSign, coupon, KYC) |
| `front/src/store/slices/authSlice.ts` | Redux: user auth state |
| **Utilities** | |
| `front/src/lib/updateLead.ts` | Lead tracking utility |
| `front/src/lib/api/auth.ts` | Auth API helpers (requestOtp, verifyOtp, signupUser, updateUserKyc) |
| `front/src/middleware.ts` | Route protection middleware |

### Backend Files

| File | Purpose |
|------|---------|
| **Routes** | |
| `server/src/routes/PaymentRoutes.ts` | Payment API route definitions |
| `server/src/routes/AuthRoutes.ts` | Auth API route definitions |
| `server/src/routes/esignRoutes.ts` | eSign API route definitions |
| **Controllers** | |
| `server/src/controllers/PaymentController.ts` | Payment logic: checkout, order creation, verification, enrollment |
| `server/src/controllers/AuthController/OTPController.ts` | OTP send/verify logic |
| `server/src/controllers/AuthController/UserAuthController.ts` | User signup logic |
| `server/src/controllers/CourseController.ts` | Course CRUD operations |
| **Models** | |
| `server/src/models/TransactionModels.ts` | OrderModel, LeadModel, WalletTransactionModel, PaymentDetailsModel, RazorpayKeyModel, CashfreeKeyModel |
| `server/src/models/CourseOrder.ts` | CourseOrderModel |
| `server/src/models/Enrollment.ts` | EnrollmentModel |
| `server/src/models/AuthModels.ts` | User, ServiceProvider, Admin models |
| **Integrations** | |
| `server/src/config/RazorpayInit.ts` | Razorpay SDK initialization |
| `server/src/helpers/razorpaySubscription.ts` | Razorpay subscription helpers |
| `server/src/helpers/cashfreeCheckout.ts` | Cashfree order creation + verification |
| **Middleware** | |
| `server/src/middleware/AdminSecurity.ts` | Token verification + role-based access |
