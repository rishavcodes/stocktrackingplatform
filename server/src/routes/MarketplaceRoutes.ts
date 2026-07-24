import { Router } from "express";
import {
	createMarketplaceController,
	deleteMarketplaceController,
	deleteMarketplaceBannerController,
	getAllMarketplacesController,
	getBrokerAnalytics,
	getBrokerLeads,
	getBrokerProviders,
	getBrokerStats,
	getBrokerSubscribers,
	getMyInvitationsController,
	getSingleMarketplaceController,
	respondToInvitationController,
	updateMarketplaceController,
	updateMarketplaceBannersController,
	uploadMarketplaceBannersController,
} from "../controllers/MarketplaceController";
import { verifyUserRATokenMiddleware } from "../middleware/AdminSecurity";
import { uploadMarketplaceBanners } from "../helpers/tncFileHelper";

const router = Router();

router.post("/", verifyUserRATokenMiddleware, createMarketplaceController);
router.get("/", verifyUserRATokenMiddleware, getAllMarketplacesController);

// Broker dashboard routes (must be before /:marketplaceId to avoid conflicts)
router.get("/broker/subscribers", verifyUserRATokenMiddleware, getBrokerSubscribers);
router.get("/broker/leads", verifyUserRATokenMiddleware, getBrokerLeads);
router.get("/broker/providers", verifyUserRATokenMiddleware, getBrokerProviders);
router.get("/broker/stats", verifyUserRATokenMiddleware, getBrokerStats);
router.get("/broker/analytics", verifyUserRATokenMiddleware, getBrokerAnalytics);

router.patch(
	"/:marketplaceId",
	verifyUserRATokenMiddleware,
	updateMarketplaceController,
);

// Banner management routes
router.post(
	"/:marketplaceId/banners",
	verifyUserRATokenMiddleware,
	uploadMarketplaceBanners.array("banners", 10),
	uploadMarketplaceBannersController,
);
router.patch(
	"/:marketplaceId/banners",
	verifyUserRATokenMiddleware,
	updateMarketplaceBannersController,
);
router.delete(
	"/:marketplaceId/banners",
	verifyUserRATokenMiddleware,
	deleteMarketplaceBannerController,
);

router.delete(
	"/:marketplaceId",
	verifyUserRATokenMiddleware,
	deleteMarketplaceController,
);

// RA routes for invitations
router.get(
	"/invitations",
	verifyUserRATokenMiddleware,
	getMyInvitationsController,
);
router.patch(
	"/invitations/:marketplaceId/respond",
	verifyUserRATokenMiddleware,
	respondToInvitationController,
);

// Single marketplace route (must be after /invitations and /broker to avoid conflicts)
// Public route - no authentication required
router.get("/:marketplaceId", getSingleMarketplaceController);

export default {
	routes: router,
};
