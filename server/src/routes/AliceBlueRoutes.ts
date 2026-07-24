import { Router } from "express";
import {
  getSSOUrl,
  getSession,
  getContract,
} from "../controllers/AliceBlue/loginController";
import {
  placeOrder,
  getOrderBook,
  orderHistory,
  modifyOrder,
  cancelOrder,
  getTradeBook,
  checkMargin,
  basketMargin,
  exitBracketOrder,
} from "../controllers/AliceBlue/orderController";
import { verifyAliceBlueSessionMiddleware } from "../middleware/AliceBlueAuth";

const router = Router();

router.get("/sso-url", getSSOUrl);

router.post("/get-session", getSession);

router.get("/contract", getContract);

router.post("/orders/place-order", verifyAliceBlueSessionMiddleware, placeOrder);

router.get("/orders/book", verifyAliceBlueSessionMiddleware, getOrderBook);

router.post("/orders/history", verifyAliceBlueSessionMiddleware, orderHistory);

router.post("/orders/modify", verifyAliceBlueSessionMiddleware, modifyOrder);

router.post("/orders/cancel", verifyAliceBlueSessionMiddleware, cancelOrder);

router.get("/orders/trades", verifyAliceBlueSessionMiddleware, getTradeBook);

router.post("/orders/checkMargin", verifyAliceBlueSessionMiddleware, checkMargin);

router.post("/orders/basket/margin", verifyAliceBlueSessionMiddleware, basketMargin);

router.post("/orders/exit/sno", verifyAliceBlueSessionMiddleware, exitBracketOrder);

export default {
  routes: router,
};
