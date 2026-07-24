import { Router } from "express";
import {
  partnerSessionLogin,
  getSSOUrl,
  sessionLogout,
  getSSORedirectUrl,
} from "../controllers/Bigul/loginController";
import { placeOrder, getOrderBook, getOrderHistory, getTradeBook, getPositionBook, getHoldings, modifyOrder, cancelOrder, checkMargin, getUserLimits } from "../controllers/Bigul/orderController";
import { resolveScript } from "../controllers/Bigul/scriptResolver";
import { syncBigulScriptMasterData } from "../scheduled-jobs/syncBigulScriptMaster";
import { verifyBigulSessionMiddleware } from "../middleware/BigulAuth";

const router = Router();

// Script resolution (no auth — data lookup)
router.get("/resolve-script", resolveScript);

// Manual trigger for Bigul script master sync
router.post("/sync-master", async (_req, res) => {
  syncBigulScriptMasterData();
  res.json({ message: "Bigul script master sync triggered" });
});

// Partner auth (no Bearer required)
router.post("/partner/session-login", partnerSessionLogin);
router.get("/sso-url", getSSOUrl);
router.post("/partner/session-logout", sessionLogout);
router.get("/partner/sso-redirect", getSSORedirectUrl);

// Order APIs (require Bearer token from Bigul SSO)
router.post("/orders/place-order", verifyBigulSessionMiddleware, placeOrder);
router.post("/orders/book", verifyBigulSessionMiddleware, getOrderBook);
router.post("/orders/trade-book", verifyBigulSessionMiddleware, getTradeBook);
router.post("/orders/position-book", verifyBigulSessionMiddleware, getPositionBook);
router.post("/orders/holdings", verifyBigulSessionMiddleware, getHoldings);
router.post("/orders/history", verifyBigulSessionMiddleware, getOrderHistory);
router.post("/orders/modify", verifyBigulSessionMiddleware, modifyOrder);
router.post("/orders/cancel", verifyBigulSessionMiddleware, cancelOrder);
router.post("/orders/check-margin", verifyBigulSessionMiddleware, checkMargin);
router.post("/orders/user-limits", verifyBigulSessionMiddleware, getUserLimits);

export default {
  routes: router,
};
