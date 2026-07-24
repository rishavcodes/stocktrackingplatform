    import mongoose from "mongoose";

const WalletTransactionSchema = new mongoose.Schema(
  {
    serviceProviderId: {
      type: String,
      required: true,
    },
    orderdBy: {
      name: { type: String, required: true },
      id: { type: String, required: true },
      email: { type: String, required: true },
    },
    paymentId: { type: String, required: false },
    orderId: {
      type: String,
      required: false,
      index: true,
    },
    esignClientId: {
      type: String,
      required: false,
      index: true,
    },
    // Plan / service name captured at debit time so the wallet list can show
    // it without depending on a later order-id patch (the e-sign debit happens
    // before the Order document exists).
    serviceName: { type: String, required: false },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: [
        "topup",
        "withdraw",
        "additional_charge",
        "manual-topup",
        "subscription-charge",
        "Onboarding-Charge",
        "Renewal-Charge",
        "deduction",
        "model-portfolio-charge",
        "course-sale",
        "marketplace-broker-commission",
      ],
      required: true,
    },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

const kycSchema = new mongoose.Schema({
  aadhaarUrl: { type: String }, // S3 URL for Aadhaar file
  panUrl: { type: String }, // S3 URL for PAN file
  panNumber: { type: String },
  dob: { type: String },
  kycDate: { type: Date, default: Date.now }, // Date of KYC completion
});

const OrderSchema = new mongoose.Schema(
  {
    subscribedToId: { type: String, required: true },
    serviceName: { type: String, required: true },
    orderdBy: {
      name: { type: String, required: true },
      id: { type: String, required: true },
      email: { type: String, required: true },
    },
    soldBy: {
      name: { type: String, required: true },
      id: { type: String, required: true },
    },
    // Unique + sparse: prevents two orders sharing the same gateway payment id
    // (idempotency backstop if the app-level guard races). Sparse = documents
    // without a paymentId are skipped by the index, so legacy/manual orders
    // without one don't conflict.
    paymentId: { type: String, index: { unique: true, sparse: true } },
    orderId: { type: String },
    amount: { type: Number },
    subtotal: { type: Number },
    gst: { type: Number },
    total: { type: Number },
    paymentMethod: { type: String, required: true },
    isExpired: { type: Boolean, default: false },
    validity: { type: String, required: true },
    remainder: { type: Number, default: 0 },
    invoiceLink: { type: String },
    invoiceNumber: { type: String },
    type: { type: String },
    signedDocumentUrl: { type: String },
    paymentProof: { type: String },
    verifiedByRa: { type: Boolean, default: false },
    kycDetails: kycSchema,
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    telegramInviteLink: { type: String }, // actual invite link URL
    telegramInviteLinkId: { type: String },

    telegramInviteLinks: [
      {
        serviceId: { type: String },
        serviceName: { type: String },
        link: { type: String },
      },
    ],
    
    previousOrderId: {
      type: String,
      default: null,
    },
    isRenewal: {
      type: Boolean,
      default: false,
    },
    isRenewed: {
      type: Boolean,
      default: false,
    },
    renewedAt: {
      type: Date,
      default: null,
    },
    coupon: {
      id: { type: String },
      code: { type: String },
      type: { type: String },
      value: { type: Number },
    },

    discountAmount: { type: Number, default: 0 },

    // SP-supplied note when manually converting a stuck lead to a subscriber
    // from the leads dashboard (e.g. "Paid via UPI to abc@upi").
    conversionNote: { type: String },

    // Payment verification status. Default is "pending" as a safety net;
    // every write site (gateway verify, manual verify) sets this explicitly.
    paymentStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String }, // Reason if payment is rejected

    // Telegram removal tracking for expired orders
    telegramRemoved: { type: Boolean, default: false },
    telegramRemovalAttempts: { type: Number, default: 0 },

    // Marketplace purchase tracking
    marketplaceId: { type: String, default: null },
    brokerCommission: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const WithdrawalSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    spId: { type: String, required: true },
    referenceNo: { type: String },
    notes: { type: String },
    processedStatus: {
      type: String,
      enum: ["pending", "approved", "processed", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const TradeboxPlansSchema = new mongoose.Schema(
  {
    serviceId: { type: String, required: false, ref: "services" },
    orderdBy: {
      name: { type: String, required: true },
      id: { type: String, required: true },
      email: { type: String, required: true },
    },
    plan: { type: String, enum: ["Prepaid", "Postpaid"], required: true },
    amount: { type: Number, required: true },
    gst: { type: Number, required: true },
    total: { type: Number, required: true },    
    duration: { type: Number, required: true },
    startDate: { type: Date },
    endDate: { type: Date },

    isExpired: { type: Boolean, default: false },
    validity: { type: String },
    remainder: { type: Number, default: 0 },
    invoiceLink: { type: String },

    status: {
      type: String,
      enum: ["pending", "approved", "processed", "rejected", "active","inactive"],
      default: "pending",
    },
    // Prepaid fields
    freshOnboardingCharge: { type: Number },
    renewalCharge: { type: Number },
    customerLimit: { type: Number },

    // Postpaid fields
    oneTimesetupFee: { type: Number },
    pricingType: { type: String, enum: ["Fixed", "Percentage"] },

    // Percentage pricing (Postpaid)
    percentageFreshOnboarding: { type: Number },
    percentageRenewal: { type: Number },

    // Fixed pricing (Postpaid)
    fixedFreshOnboardingCharge: { type: Number },
    fixedRenewalCharge: { type: Number },
    fixedCommercialFee: { type: Number },

    billingCycle: {
      lastBillingDate: { type: Date },
      nextBillingDate: { type: Date },
    },
  },
  { timestamps: true }
);

const PaymentDetailsSchema = new mongoose.Schema({
  bankName: { type: String },
  beneficiaryName: { type: String },
  accNumber: { type: String },
  ifsc: { type: String },
  upi: { type: String },
  qrCode: { type: String },
});

const PromoCodeTracker = new mongoose.Schema(
  {
    availedBy: { type: String, ref: "serviceproviders" },
    promo: { type: String },
    serviceId: { type: String, ref: "services" },
  },
  { timestamps: true }
);

const GSTTableSchema = new mongoose.Schema(
  {
    amountSP: { type: Number },
    amountTradebox: { type: Number },
    from: { type: String },
    to: { type: String },
  },
  { timestamps: true }
);

const invoiceCountSchema = new mongoose.Schema({
  count: { type: Number, default: 1 },
  lastUpdated: { type: Date, default: Date.now },
});

const invoiceCountSchemaSP = new mongoose.Schema({
  count: { type: Number, default: 1 },
  lastUpdated: { type: Date, default: Date.now },
});

const LeadSchema = new mongoose.Schema(
  {
    serviceId: { type: String, required: true },
    userId: { type: String, required: true },
    providerId: { type: String },

    type: {
      type: String,
      enum: ["service", "portfolio"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "initiated",
        "logged_in",
        "added_to_cart",
        "esign_started",
        "esign_completed",
        "checkout_started",
        "payment_success",
        "payment_failed",
        "converted",
        "abandoned",
      ],
      default: "initiated",
    },

    // SP-managed sales outcome — independent of the funnel `status` above.
    // The provider classifies leads from their dashboard so they can track
    // follow-ups; the funnel `status` continues to be auto-driven by
    // checkout/login events.
    salesStatus: {
      type: String,
      enum: [
        "Open",
        "Still in Process",
        "Not Interested",
        "Closed",
        "Others",
      ],
      default: "Open",
    },
    salesStatusDescription: { type: String, default: "" },

    // metadata about when it failed
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const OrderModel = mongoose.model("orders", OrderSchema);
export const WithdrawalModel = mongoose.model("withdrawals", WithdrawalSchema);
export const TradeboxPlansModel = mongoose.model(
  "tradeboxplans",
  TradeboxPlansSchema
);
export const PaymentDetailsModel = mongoose.model(
  "paymentdetails",
  PaymentDetailsSchema
);

export const PromoCodeTrackerModel = mongoose.model(
  "promotracker",
  PromoCodeTracker
);

export const GSTTableModel = mongoose.model("gstdata", GSTTableSchema);

export const InvoiceCount = mongoose.model("InvoiceCount", invoiceCountSchema);

export const InvoiceCountSP = mongoose.model(
  "InvoiceCountSP",
  invoiceCountSchemaSP
);

export const WalletTransactionModel = mongoose.model(
  "WalletTransaction",
  WalletTransactionSchema
);

export const LeadModel = mongoose.model("Lead", LeadSchema);