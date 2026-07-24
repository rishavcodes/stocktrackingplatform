import { Request, Response } from "express";
import { ScriptMasterModel } from "../models/ScriptMasterModel";
import { syncScriptMasterData } from "../scheduled-jobs/syncScriptMaster";
import { parseExpiry } from "../utils/parseExpiry";

/**
 * GET /api/scripts/symbols
 * Query params: exch_seg, instrumenttype (optional)
 * Returns distinct symbol names for the given exchange/segment
 */
export async function getSymbols(req: Request, res: Response) {
  try {
    const { exch_seg, instrumenttype } = req.query;

    if (!exch_seg) {
      return res.status(400).json({ message: "exch_seg is required" });
    }

    const filter: any = { exch_seg };
    if (instrumenttype) {
      filter.instrumenttype = instrumenttype;
    }

    const names = await ScriptMasterModel.distinct("name", filter);
    names.sort((a: string, b: string) => a.localeCompare(b));

    return res.json({ data: names });
  } catch (error) {
    console.error("getSymbols error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /api/scripts/expiries
 * Query params: exch_seg, instrumenttype, name, strike (optional)
 * Returns distinct future expiry dates for the given filters
 */
export async function getExpiries(req: Request, res: Response) {
  try {
    const { exch_seg, instrumenttype, name, strike } = req.query;

    if (!exch_seg || !instrumenttype || !name) {
      return res
        .status(400)
        .json({ message: "exch_seg, instrumenttype, and name are required" });
    }

    const filter: any = { exch_seg, instrumenttype, name };
    if (strike) {
      filter.strike = strike;
    }

    const expiries = await ScriptMasterModel.distinct("expiry", filter);

    // Parse and filter to only future expiries (shared util — also fixes
    // the year-2-digit bug where new Date(25, …) was resolving to 1925).
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureExpiries = expiries
      .filter((exp: string) => {
        const d = parseExpiry(exp);
        return d && d >= today;
      })
      .sort((a: string, b: string) => {
        const da = parseExpiry(a)!;
        const db = parseExpiry(b)!;
        return da.getTime() - db.getTime();
      });

    return res.json({ data: futureExpiries });
  } catch (error) {
    console.error("getExpiries error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /api/scripts/strikes
 * Query params: exch_seg, instrumenttype, name
 * Returns distinct strike prices for the given filters
 */
export async function getStrikes(req: Request, res: Response) {
  try {
    const { exch_seg, instrumenttype, name } = req.query;

    if (!exch_seg || !instrumenttype || !name) {
      return res
        .status(400)
        .json({ message: "exch_seg, instrumenttype, and name are required" });
    }

    const strikes = await ScriptMasterModel.distinct("strike", {
      exch_seg,
      instrumenttype,
      name,
    });

    strikes.sort((a: string, b: string) => Number(b) - Number(a));

    return res.json({ data: strikes });
  } catch (error) {
    console.error("getStrikes error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * GET /api/scripts/token
 * Query params: exch_seg, name, expiry, strike, option (CE/PE suffix), instrumenttype
 * Returns the matching token, symbol, and lotsize
 * Also handles equity lookups (just exch_seg + name)
 */
export async function getToken(req: Request, res: Response) {
  try {
    const { exch_seg, name, expiry, strike, option, instrumenttype } =
      req.query;

    if (!exch_seg || !name) {
      return res
        .status(400)
        .json({ message: "exch_seg and name are required" });
    }

    // Equity lookup — simple match by exch_seg + name
    if (!expiry && !strike) {
      const doc = await ScriptMasterModel.findOne(
        { exch_seg, name },
        { token: 1, symbol: 1, lotsize: 1, _id: 0 }
      ).lean();

      if (!doc) {
        return res.status(404).json({ message: "Token not found" });
      }
      return res.json({ data: doc });
    }

    // FnO lookup
    const filter: any = { exch_seg, name };
    if (expiry) filter.expiry = expiry;
    if (strike) filter.strike = strike;
    if (instrumenttype) filter.instrumenttype = instrumenttype;

    let docs = await ScriptMasterModel.find(filter, {
      token: 1,
      symbol: 1,
      lotsize: 1,
      _id: 0,
    }).lean();

    // If option (CE/PE) is specified, filter by symbol suffix
    if (option && docs.length > 0) {
      docs = docs.filter((d) => d.symbol.slice(-2) === option);
    }

    // For futures, filter by FUT suffix
    if (
      instrumenttype &&
      (instrumenttype === "FUTIDX" ||
        instrumenttype === "FUTSTK" ||
        instrumenttype === "FUTCOM") &&
      docs.length > 0
    ) {
      docs = docs.filter((d) => d.symbol.slice(-3) === "FUT");
    }

    if (docs.length === 0) {
      return res.status(404).json({ message: "Token not found" });
    }

    return res.json({ data: docs[0] });
  } catch (error) {
    console.error("getToken error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * POST /api/scripts/sync
 * Manually triggers a sync of the ScriptMaster data
 */
export async function triggerSync(req: Request, res: Response) {
  try {
    // Fire and forget — don't block the response
    syncScriptMasterData();
    return res.json({ message: "Sync started" });
  } catch (error) {
    console.error("triggerSync error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
