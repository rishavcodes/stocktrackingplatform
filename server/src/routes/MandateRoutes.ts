import { Router } from "express";
import {
  cancelMandate,
  getMandateStatus,
  getMyMandates,
  simulateMandateCharge,
} from "../controllers/MandateController";

const router = Router();

/**
 * @swagger
 * /api/mandate/cancel/{mandateId}:
 *   post:
 *     summary: Cancel auto-renewal mandate
 *     description: Cancels the UPI auto-pay mandate. Current plan stays active until expiry.
 *     tags: [Mandate]
 *     parameters:
 *       - in: path
 *         name: mandateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mandate cancelled successfully
 *       404:
 *         description: Mandate not found
 */
router.post("/cancel/:mandateId", cancelMandate);

/**
 * @swagger
 * /api/mandate/status/{orderId}:
 *   get:
 *     summary: Get mandate status for an order
 *     description: Returns auto-renewal mandate details for the given order, including live Razorpay status.
 *     tags: [Mandate]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mandate status
 */
router.get("/status/:orderId", getMandateStatus);

/**
 * @swagger
 * /api/mandate/my-mandates:
 *   get:
 *     summary: Get all mandates for the current user
 *     description: Returns all auto-renewal mandates belonging to the authenticated user.
 *     tags: [Mandate]
 *     responses:
 *       200:
 *         description: List of mandates
 */
router.get("/my-mandates", getMyMandates);

/**
 * @swagger
 * /api/mandate/test/simulate-charge/{mandateId}:
 *   post:
 *     summary: "[TEST] Simulate a subscription charge"
 *     description: Bypasses Razorpay's paid_count and runs the full renewal flow as if a charge was collected. For testing only.
 *     tags: [Mandate]
 *     parameters:
 *       - in: path
 *         name: mandateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Simulation result
 */
router.post("/test/simulate-charge/:mandateId", simulateMandateCharge);

export default router;
