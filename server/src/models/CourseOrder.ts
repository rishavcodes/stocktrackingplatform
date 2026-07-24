import mongoose, { Schema } from "mongoose";

const CourseOrderSchema = new Schema(
  {
    orderId: { type: String, trim: true, required: true, index: true }, // your internal order id / receipt id if any
    razorpayOrderId: { type: String, trim: true, required: true, index: true },
    razorpayPaymentId: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },
    razorpaySignature: { type: String, trim: true },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "courses",
      required: true,
      index: true,
    },
    subtotal: { type: Number, required: true }, // stored in smallest currency unit (paise) or rupees depending on your choice — be consistent
    gst: { type: Number, required: true }, // stored in smallest currency unit (paise) or rupees depending on your choice — be consistent
    total: { type: Number, required: true }, // stored in smallest currency unit (paise) or rupees depending on your choice — be consistent
    currency: { type: String, default: "INR" },
    revenueBreakdown: {
      commissionPercentage: { type: Number, required: true }, // e.g. 30

      ra: {
        subtotal: { type: Number, required: true },
        gst: { type: Number, required: true },
        total: { type: Number, required: true },
      },

      tradebox: {
        subtotal: { type: Number, required: true },
        gst: { type: Number, required: true },
        total: { type: Number, required: true },
      },
    },
    marketplaceId: { type: String, default: null },
    brokerCommission: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "paid",
    },
  },
  { timestamps: true, versionKey: false }
);

export const CourseOrderModel =
  mongoose.models.courseorders ||
  mongoose.model("courseorders", CourseOrderSchema);

export type CourseOrderDocument = mongoose.InferSchemaType<
  typeof CourseOrderSchema
>;
