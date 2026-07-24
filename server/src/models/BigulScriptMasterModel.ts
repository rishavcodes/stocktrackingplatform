import mongoose from "mongoose";

const BigulScriptMasterSchema = new mongoose.Schema(
  {
    segment: { type: String, required: true },
    scripCode: { type: String, required: true },
    exch: { type: String, default: "" },
    name: { type: String, default: "" },
    tradingSymbol: { type: String, default: "" },
    desc: { type: String, default: "" },
    tickSize: { type: String, default: "" },
    series: { type: String, default: "" },
    lotSize: { type: String, default: "1" },
    instrumentType: { type: String, default: "" },
    cpType: { type: String, default: "" },
    strikePrice: { type: String, default: "" },
    expiryDate: { type: String, default: "" },
    underlyingToken: { type: String, default: "" },
  },
  { timestamps: true }
);

BigulScriptMasterSchema.index({ segment: 1, scripCode: 1 }, { unique: true });
BigulScriptMasterSchema.index({ segment: 1, name: 1 });
BigulScriptMasterSchema.index({ segment: 1, tradingSymbol: 1 });

export const BigulScriptMasterModel = mongoose.model(
  "BigulScriptMaster",
  BigulScriptMasterSchema
);
