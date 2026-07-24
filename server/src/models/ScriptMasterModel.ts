import mongoose from "mongoose";

const ScriptMasterSchema = new mongoose.Schema(
  {
    token: { type: String, required: true },
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    expiry: { type: String, default: "" },
    strike: { type: String, default: "0.000000" },
    lotsize: { type: String, default: "1" },
    instrumenttype: { type: String, default: "" },
    exch_seg: { type: String, required: true },
    tick_size: { type: String, default: "0.000000" },
  },
  { timestamps: true }
);

// Compound indexes for the queries the frontend will make
ScriptMasterSchema.index({ exch_seg: 1, instrumenttype: 1, name: 1 });
ScriptMasterSchema.index({ exch_seg: 1, name: 1, expiry: 1, strike: 1 });
ScriptMasterSchema.index({ token: 1, exch_seg: 1 }, { unique: true });

export const ScriptMasterModel = mongoose.model(
  "ScriptMaster",
  ScriptMasterSchema
);
