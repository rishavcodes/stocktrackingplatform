import mongoose from "mongoose";
import { AuthorDataSchema } from "./PostModels";

const TargetSchema = new mongoose.Schema(
  {
    price: { type: Number, required: true },
    quantityPercent: { type: Number },
    isHit: { type: Boolean, default: false },
    hitAt: { type: Date },
  },
  { _id: false }
);

const ScoreCardSchema = new mongoose.Schema(
  {
    authorData: AuthorDataSchema,
    exchange: { type: String, required: true },
    scriptname: { type: String, required: true },
    token: { type: String, required: true },
    entryPrice: { type: Number, required: true },
    entryType: { type: String, enum: ["buy", "sell"], required: true },
    rate: { type: Number },
    riskRewardRatio: { type: String },
    upperRange: { type: Number },
    lowerRange: { type: Number },
    targets: [TargetSchema],
    target: { type: Number, required: true },
    stoploss: { type: Number, required: true },
    validity: { type: Date },
    // Contract expiry for FnO / MCX trades — stored as the broker-style
    // "DDMMMYY" string (e.g., "28APR26"). Optional; cash-equity trades
    // leave it unset. Used to cap modify-time validity changes against
    // the underlying contract.
    expiry: { type: String },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    result: {
      type: String,
      enum: ["tp", "sl", "open", "timeout", "manual"],
      default: "open",
    },
    pnl: { type: Number },
    ltp: { type: Number },
    pnlpercentage: { type: Number },
    istriggered: {
      type: String,
      enum: ["triggered", "not triggered"],
      default: "not triggered",
    },
    exitRate: { type: Number },
    shareWith: [{ type: String, default: ["none"] }],
    shareWithMarketplaces: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Marketplace" },
    ],
    shareWithPlans: [{ type: String }],
    holdingPeriod: {
      type: String,
      enum: ["intraday", "btst", "forward"],
      required: true,
    },
    exitDate: { type: String },
    link: { type: String },
    notes: { type: String },
    recommendationPDF: { type: String, default: "" },
    lotsize: { type: Number },
    telegramSent: {
      type: Boolean,
      default: false,
    },
    rationalText: {
      type: String,
      default: "",
    },
    rationalPDF: {
      type: String,
      default: "",
    },
    rationalGeneratedAt: { type: Date, default: null },
    triggerType: {
      type: String,
      enum: ["above", "below", "immediate"],
      default: "immediate",
    },
  },
  { timestamps: true }
);

// Compound index for the SP "My Recommendations" dashboard query:
//   ScoreCardModel.find({ "authorData.id": { $in: ids }, status })
//     .sort({ createdAt: -1 })
// Covers both find+sort+limit and the matching countDocuments. Without it
// the dashboard does a full collection scan + sort on every load (visible
// as a 10-second cold start on populated collections).
ScoreCardSchema.index({ "authorData.id": 1, status: 1, createdAt: -1 });

// Subscribed-user dashboard (`updateLiveScoreCardForSubscribed`) hits
// `find({ shareWithPlans: { $in: ids }, shareWith: "subscribers", status: "closed" })
//    .sort({ createdAt: -1 })`. Lead with shareWithPlans (the most selective
// $in filter), then the two equality predicates, then the sort.
ScoreCardSchema.index({ shareWithPlans: 1, shareWith: 1, status: 1, createdAt: -1 });

// Marketplace dashboard (`updateLiveScoreCardForMarketplace`) filters by
// shareWithMarketplaces + status, ordered by createdAt. Mirrors the SP
// dashboard index but keyed on the marketplace ObjectId array.
ScoreCardSchema.index({ shareWithMarketplaces: 1, status: 1, createdAt: -1 });

export const ScoreCardModel = mongoose.model("scorecard", ScoreCardSchema);

const portfolioHistorySchema = new mongoose.Schema({
  portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: "Portfolio" },
  date: { type: Date, default: Date.now },
  totalValue: Number, // current portfolio value
  totalInvestment: Number, // total cost invested
  pnl: Number, // Profit & Loss (value - investment)
});

const PortfolioHistory = mongoose.model(
  "PortfolioHistory",
  portfolioHistorySchema
);
export { PortfolioHistory };
