import mongoose from "mongoose";
import { AuthorDataSchema } from "./PostModels";

export const PackageSchema = new mongoose.Schema(
  {
    authorData: AuthorDataSchema,

    title: { type: String, required: true },
    description: { type: String, required: true },

    includedServices: [
      { type: mongoose.Schema.Types.ObjectId, ref: "services", required: true },
    ],

    pricingPlans: [
      {
        price: { type: Number, required: true },
        validity: { type: Number, required: true }, // days
      },
    ],

    bannerURL: String,
    tncFileURL: String,

    activated: { type: Boolean, default: true },
    approvalStatus: { type: Boolean, default: false },

    shareWithMarketplaces: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Marketplace" },
    ],

    stats: {
      purchases: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const PackageModel = mongoose.model("Packages", PackageSchema);
