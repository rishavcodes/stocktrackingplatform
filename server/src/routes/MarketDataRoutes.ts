import { Router, Request, Response } from "express";
import { getMarketData } from "../helpers/marketData";

const router = Router();

/**
 * GET /api/market-data/live
 * Returns current Nifty 50 & Sensex (and optional Dow, Gold) for display on marketplace etc.
 * Data is updated every ~2s by the market data service (Yahoo Finance).
 */
router.get("/live", (req: Request, res: Response) => {
  try {
    const data = getMarketData();
    return res.status(200).json({
      success: true,
      data: {
        nifty: data.nifty,
        sensex: data.sensex,
        dow: data.dow,
        gold: data.gold,
      },
    });
  } catch (err) {
    console.error("Market data route error:", err);
    return res.status(500).json({ success: false, message: "Failed to get market data" });
  }
});

export default { routes: router };
