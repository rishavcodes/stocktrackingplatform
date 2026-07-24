import mongoose from "mongoose";

const RenewalHistorySchema = new mongoose.Schema(
  {
    chargedAt: { type: Date, required: true },
    razorpayPaymentId: { type: String, required: true },
    newOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "orders",
    },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },
  },
  { _id: false }
);

const PlanDetailsSnapshotSchema = new mongoose.Schema(
  {
    serviceName: { type: String, required: true },
    type: { type: String, required: true }, // "service" | "portfolio" | "package"
    subtotal: { type: Number, required: true },
    gst: { type: Number, required: true },
    total: { type: Number, required: true },
    validity: { type: String, required: true },
    subscribedToId: { type: String, required: true },

    soldByName: { type: String, required: true },
    soldById: { type: String, required: true },
    soldByEmail: { type: String },

    orderByName: { type: String, required: true },
    orderById: { type: String, required: true },
    orderByEmail: { type: String, required: true },
  },
  { _id: false }
);

const MandateSchema = new mongoose.Schema(
  {
    // References
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "orders",
      required: true,
    },
    userId: { type: String, required: true },
    serviceProviderId: { type: String, required: true },
    subscribedToId: { type: String, required: true },

    // Razorpay IDs
    razorpayPlanId: { type: String, required: true },
    razorpaySubscriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Snapshot of plan details for renewals
    planDetails: { type: PlanDetailsSnapshotSchema, required: true },

    // Status tracking
    status: {
      type: String,
      enum: [
        "created",
        "authenticated",
        "active",
        "halted",
        "cancelled",
        "completed",
        "expired",
      ],
      default: "created",
    },

    totalCount: { type: Number, default: 120 },
    paidCount: { type: Number, default: 0 },
    nextChargeAt: { type: Date },

    // Renewal audit trail
    renewalHistory: [RenewalHistorySchema],
  },
  { timestamps: true }
);

export const MandateModel = mongoose.model("Mandate", MandateSchema);
