import { Router } from "express";
import {
  listOnboardingIssues,
  updateOnboardingIssue,
  getOnboardingIssueById,
} from "../controllers/OnboardingIssueController";
import {
  getPushPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestPush,
} from "../controllers/PushController";
import {
  ApproveEvent,
  ApproveService,
  DeleteCustomer,
  DeleteServiceProvider,
  GSTDataTable,
  activateSubscriptionFromAdmin,
  approveServiceProvider,
  approveSubscription,
  approveWithdrawal,
  calculateGST,
  claimGST,
  createMarketplaceController,
  createSubAdminController,
  deactivateSubscriptionFromAdmin,
  deductWalletManually,
  deleteMarketplaceControlleradmin,
  deleteNotification,
  deleteSubAdminController,
  enableSPServices,
  fetchAllScoreCard,
  fetchCustomerDetails,
  fetchWithdrawalRequests,
  getALLServiceProviderStats,
  getContentStatsByType,
  getALLServiceProviders,
  getAllMarketplacesForAdminController,
  getAllNotificationsForAdmin,
  getAllSubAdminsController,
  getCustomersTable,
  getLoginActivityFeed,
  getOneServiceProviderData,
  getProviderAnalyticsData,
  getProviderBillingData,
  getProviderWalletTransactionList,
  getRegisteredUsers,
  getServiceProviderPlans,
  getSubAdminById,
  getTotalAmountWallet,
  getTradeboxWalletListTradeboxPlans,
  processWithdrawal,
  regenerateServiceInvoice,
  rechargeWalletManually,
  rejectEvent,
  rejectService,
  rejectServiceProvider,
  rejectWithdrawal,
  removeArticle,
  removeEvent,
  removePodcast,
  removeService,
  removeServiceProvider,
  removeVideo,
  sendNotifications,
  setLmsCommercial,
  setProviderCustomSubdomain,
  updateMembership,
  updateServiceProviderMeta,
  updateSubAdminController,
  verifyServiceProvider,
  getAdminContactLeads,
  deleteAdminContactLead,
  broadcastAdminNotification,
  getAllServicesForAdmin,
  getServiceDetailsForAdmin,
  getAllPortfoliosForAdmin,
  getPortfolioDetailsForAdmin,
  getAllPackagesForAdmin,
  getPackageDetailsForAdmin,
  getAllMarketplacesGlobal,
  getMarketplaceDetailsForAdmin,
} from "../controllers/SuperUserActions";
import { PostNewEvent } from "../controllers/PostContentController";
import { uploadPosts } from "../helpers/postContentFileHelper";
import { adminLogout } from "../controllers/AuthController/ProviderAuthController";
import { modelPortfolioApproved, modelPortfolioApprovedList, modelPortfolionotApproved } from "../controllers/portfolio/modelportfolio";
import { verifyAdminTokenMiddleware, verifyUserRATokenMiddleware } from "../middleware/AdminSecurity";
import { impersonateUser } from "../controllers/ImpersonationController";

const router = Router();

router.get("/serviceproviders", getALLServiceProviders);

router.get("/serviceproviderstats", getALLServiceProviderStats);
router.get("/contentstatsbytype", getContentStatsByType);

router.get("/providerdetails", getOneServiceProviderData);

router.get("/providerbilling", getProviderBillingData);

router.get("/provideranalytics", getProviderAnalyticsData);

router.get("/customerstable", getCustomersTable);

router.get("/login-activity", getLoginActivityFeed);

router.get("/contactleads", getAdminContactLeads);
router.delete("/contactleads/:id", deleteAdminContactLead);
router.post("/notify-broadcast", broadcastAdminNotification);

router.get("/customerdetails", fetchCustomerDetails);

router.get("/registeredusers", getRegisteredUsers)

router.get("/fetchallscorecards", fetchAllScoreCard)

router.get("/tradeboxwallet/tradeboxplans", getTradeboxWalletListTradeboxPlans);

router.get("/tradeboxwallet/serviceproviderplans", getServiceProviderPlans);

router.get("/tradeboxwallet/totalamount", getTotalAmountWallet);

router.get("/tradeboxwallet/calculategst", calculateGST);

router.get("/tradeboxwallet/gstdatatable", GSTDataTable);

router.get("/rawallet/transaction-list", getProviderWalletTransactionList);

router.post("/tradeboxwallet/claimgst", claimGST);

router.get("/withdrawal/requests", fetchWithdrawalRequests);

router.post("/withdrawal/approve", approveWithdrawal);

router.post("/withdrawal/reject", rejectWithdrawal);

router.post("/withdrawal/process", processWithdrawal);

router.post("/order/regenerate-invoice", regenerateServiceInvoice);

router.get("/allnotifications", getAllNotificationsForAdmin);

router.post("/sendnotifications", sendNotifications);

router.post("/deletenotification", deleteNotification);

router.post("/approveserviceprovider", approveServiceProvider);

router.post("/approveevent", ApproveEvent)

router.post("/approveservice", ApproveService);

router.post("/verifyserviceprovider", verifyServiceProvider);

router.post("/rejectserviceprovider", rejectServiceProvider);

router.post("/rejectevent", rejectEvent)

router.post("/rejectservice", rejectService)

router.post("/removeserviceprovider", removeServiceProvider);

router.post("/deleteserviceprovider", DeleteServiceProvider);

router.post("/deletecustomer", DeleteCustomer);

router.post("/approve-subscription", approveSubscription);

router.post("/activate-membership", activateSubscriptionFromAdmin);

router.post("/update-membership", updateMembership),

router.delete("/deactivate-membership", deactivateSubscriptionFromAdmin),

router.post("/recharge-wallet", rechargeWalletManually);

router.post("/deduct-wallet", deductWalletManually);

router.post("/update-service-features", enableSPServices);

router.post("/removearticle", removeArticle);

router.post("/removeevent", removeEvent);

router.post("/removepodcast", removePodcast);

router.post("/removevideo", removeVideo);

router.post("/removeservice", removeService);

router.post("/createevent",  uploadPosts.single("image"), PostNewEvent);

router.get("/modelsnotapproved", modelPortfolionotApproved);

router.get("/modelsapproved", modelPortfolioApprovedList);

router.put("/update-commercials", modelPortfolioApproved);

router.post("/lms-commercial", setLmsCommercial);

router.post("/logout", adminLogout);

router.post("/subadmin/create", createSubAdminController);

router.get("/subadmin/all", getAllSubAdminsController);

router.get("/subadmin/:id", getSubAdminById);

router.put(
  "/subadmin/update/:id",
  updateSubAdminController
);

router.delete(
  "/subadmin/delete/:id",
  deleteSubAdminController
);

router.post("/update-provider-meta", updateServiceProviderMeta);

router.post("/provider-custom-subdomain", setProviderCustomSubdomain);

router.post("/createMPadmin",createMarketplaceController)

router.get("/allservices", getAllServicesForAdmin);

router.get("/servicedetails/:id", getServiceDetailsForAdmin);

router.get("/allportfolios", getAllPortfoliosForAdmin);

router.get("/portfoliodetails/:id", getPortfolioDetailsForAdmin);

router.get("/allpackages", getAllPackagesForAdmin);

router.get("/packagedetails/:id", getPackageDetailsForAdmin);

router.get("/showallmarketplace",getAllMarketplacesForAdminController)

router.get("/allmarketplaces", getAllMarketplacesGlobal);

router.get("/marketplacedetails/:id", getMarketplaceDetailsForAdmin);

router.delete("/deletemarketplaceId/:id", deleteMarketplaceControlleradmin);

// Issue a short-lived impersonation JWT so an admin can "View as" a
// service provider. The outer `verifyUserRATokenMiddleware` mounted on
// `/api/admin` already validates the caller's token against the active
// SessionModel row; the controller itself enforces that the caller is
// actually an admin (vs. an SP/user with a valid session). We deliberately
// don't stack `verifyAdminTokenMiddleware` because that middleware checks
// `AdminModel.backendToken.includes(token)`, which the admin login flow
// in this codebase doesn't populate — using it 401s every legitimate call.
router.post("/impersonate", impersonateUser);

// Onboarding Issues — real-user failure tracking inbox
router.get("/onboarding-issues", listOnboardingIssues);
router.get("/onboarding-issues/:id", getOnboardingIssueById);
router.patch("/onboarding-issues/:id", updateOnboardingIssue);

// Web Push — register/unregister admin browsers for failure notifications
router.get("/push/public-key", getPushPublicKey);
router.post("/push/subscribe", subscribeToPush);
router.delete("/push/subscribe", unsubscribeFromPush);
router.post("/push/test", sendTestPush);

export default {
  routes: router,
};
