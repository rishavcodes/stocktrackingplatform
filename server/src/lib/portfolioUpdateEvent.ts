import { Schema, model, Types, Document } from "mongoose";

export interface IPortfolioUpdateEvent extends Document {
  portfolio: Types.ObjectId;
  updatedAt: Date;
  updateType: string; // e.g., "general", "rebalance"
  description?: string;
  changes?: any; // To store the diff or updated fields
}

const PortfolioUpdateEventSchema = new Schema<IPortfolioUpdateEvent>({
  portfolio: { type: Schema.Types.ObjectId, ref: "Portfolio", required: true },
  updatedAt: { type: Date, default: Date.now },
  updateType: { type: String, required: true },
  description: { type: String },
  changes: { type: Schema.Types.Mixed },
});

export const PortfolioUpdateEvent = model<IPortfolioUpdateEvent>(
  "PortfolioUpdateEvent",
  PortfolioUpdateEventSchema
);
