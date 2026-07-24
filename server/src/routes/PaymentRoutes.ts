import { Router } from "express";
import {
  AddPaymentDetails,
  AddRazorpayKeys,
  claimPromoOneDiscount,
  createAndVerifyOrder,
  createAndVerifyOrderMarketplace,
  createOrder,
  getPaymentDetails,
  getRazorpayKeys,
  getSPPaymentDetails,
  getServiceProviderSubscriberPresence,
  getTransactions,
  getWalletBalance,
  paymentCheckOut,
  topupCheckout,
  rejectPurchase,
  // purchaseSubscription,
  subscriptionDetails,
  updatePaymentDetails,
  updateRazorpayKeys,
  verifyPayment,
  VerifyPaymentRA,
  withdrawAmount,
  getLeadsByServiceProvider,
  checkoutRzp,
  createAndEnroll,
  createAndEnrollMarketplace,
  checkEnrollment,
  topup,
  updateLead,
  updateLeadSalesStatus,
  convertLeadToSubscriber,
  deleteLead,
  verifyManualPayment,
  rejectManualPayment,
  getUserOrderForService,
  getUserBilling,
  AddCashfreeKeys,
  updateCashfreeKeys,
  getCashfreeKeys,
} from "../controllers/PaymentController";
import { upload } from "../helpers/providerRegFileHelper";
import { uploadPaymentProof } from "../helpers/userRegFileHelper";
import { verifyUserRATokenMiddleware } from "../middleware/AdminSecurity";

const router = Router();

router.post("/checkout", paymentCheckOut);

router.post("/topupcheckout", topupCheckout);

router.post("/checkoutrzp", checkoutRzp);

router.post("/createandenroll", createAndEnroll);
router.post("/createandenrollmarketplace", createAndEnrollMarketplace);

router.get("/enrollment/check", checkEnrollment);

router.post("/withdraw/serviceprovider", withdrawAmount);

router.post("/promo/PROMO1", claimPromoOneDiscount);

router.get("/walletbalance", getWalletBalance);

router.get("/transactions", getTransactions);

router.get(
  "/subscriber-presence",
  verifyUserRATokenMiddleware,
  getServiceProviderSubscriberPresence
);

router.get("/leads", verifyUserRATokenMiddleware, getLeadsByServiceProvider);

router.patch("/leads/update", verifyUserRATokenMiddleware, updateLead)

router.patch(
  "/leads/:leadId/sales-status",
  verifyUserRATokenMiddleware,
  updateLeadSalesStatus
);

router.post(
  "/leads/:leadId/convert",
  verifyUserRATokenMiddleware,
  // Optional signed-document upload for any-stage conversions. multer
  // tolerates the field being absent — pure-JSON requests still parse via
  // express.json upstream because no file is included.
  uploadPaymentProof.single("signedDocument"),
  convertLeadToSubscriber
);

router.delete(
  "/leads/:leadId",
  verifyUserRATokenMiddleware,
  deleteLead
);

router.post("/add/paymentdetails", upload.single("qrCode"), AddPaymentDetails);

router.post("/update/paymentdetails",upload.single("qrCode"),updatePaymentDetails);

router.get("/get/paymentdetails", getPaymentDetails);

router.get("/subscription-details", subscriptionDetails)

router.post("/createandverifyorder", uploadPaymentProof.single("paymentProof"), createAndVerifyOrder);

router.post("/createandverifyordermarketplace", uploadPaymentProof.single("paymentProof"), createAndVerifyOrderMarketplace);

// Manual payment verification routes (for service provider dashboard)
router.post("/verify-manual-payment", verifyManualPayment);

router.post("/reject-manual-payment", rejectManualPayment);

// Get user's order for a specific service (for renewal UI)
router.get("/user-order/:serviceId", getUserOrderForService);

// Get all orders for a user (billing page)
router.get("/user-billing", getUserBilling);

router.get("/get/razorpaykeys", getRazorpayKeys);

router.get("/get/getsppaymentdetails", getSPPaymentDetails)

router.post("/add/razorpaykeys", AddRazorpayKeys);

router.post("/update/razorpaykeys", updateRazorpayKeys);

router.get("/get/cashfreekeys", getCashfreeKeys);

router.post("/add/cashfreekeys", AddCashfreeKeys);

router.post("/update/cashfreekeys", updateCashfreeKeys);

router.post("/RAtopUp",topup)
export default {
  routes: router,
};
