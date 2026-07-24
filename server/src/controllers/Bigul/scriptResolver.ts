import { Request, Response } from "express";
import { BigulScriptMasterModel } from "../../models/BigulScriptMasterModel";

/** Angel One exchange → Bigul segment */
const EXCHANGE_TO_SEGMENT: Record<string, string> = {
  NSE: "nse_cm",
  BSE: "bse_cm",
  NFO: "nse_fo",
  BFO: "bse_fo",
  MCX: "mcx_fo",
  CDS: "cde_fo",
};

/**
 * @route  GET /api/bigul/resolve-script
 * @desc   Resolve an Angel One token/scriptname to its Bigul equivalent.
 * @query  exchange (required) — Angel One exchange code (NSE, NFO, BFO, MCX, CDS, BSE)
 *         token    (required) — Angel One instrument token
 *         scriptname (optional) — Angel One display symbol, used for fallback matching
 * @access Public (data lookup, no auth needed)
 */
export const resolveScript = async (req: Request, res: Response) => {
  try {
    const exchange = (req.query.exchange as string || "").toUpperCase();
    const token = (req.query.token as string || "").trim();
    const scriptname = (req.query.scriptname as string || "").trim();

    if (!exchange || !token) {
      return res.status(400).json({
        found: false,
        message: "exchange and token query parameters are required",
      });
    }

    const segment = EXCHANGE_TO_SEGMENT[exchange];
    if (!segment) {
      return res.status(400).json({
        found: false,
        message: `Unknown exchange: ${exchange}`,
      });
    }

    // Primary lookup: segment + scripCode (exchange tokens should match)
    let doc = await BigulScriptMasterModel.findOne(
      { segment, scripCode: token },
      { scripCode: 1, tradingSymbol: 1, segment: 1, name: 1, lotSize: 1, _id: 0 }
    ).lean();

    // Fallback: match by name (Angel One scriptname vs Bigul name)
    if (!doc && scriptname) {
      doc = await BigulScriptMasterModel.findOne(
        { segment, name: { $regex: new RegExp(`^${escapeRegex(scriptname)}$`, "i") } },
        { scripCode: 1, tradingSymbol: 1, segment: 1, name: 1, lotSize: 1, _id: 0 }
      ).lean();
    }

    // Second fallback: match by tradingSymbol
    if (!doc && scriptname) {
      doc = await BigulScriptMasterModel.findOne(
        { segment, tradingSymbol: { $regex: new RegExp(`^${escapeRegex(scriptname)}$`, "i") } },
        { scripCode: 1, tradingSymbol: 1, segment: 1, name: 1, lotSize: 1, _id: 0 }
      ).lean();
    }

    if (doc) {
      return res.json({
        found: true,
        scripCode: doc.scripCode,
        tradingSymbol: doc.tradingSymbol,
        segment: doc.segment,
        name: doc.name,
        lotSize: doc.lotSize,
      });
    }

    return res.json({ found: false });
  } catch (error: any) {
    console.error("resolveScript error:", error);
    return res.status(500).json({
      found: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
