import { Router } from "express";
import {
  GetArticles,
  GetEvents,
  GetServiceProviders,
  GetVideos,
  getSubProfiles,
  GetServiceProviderByCategory,
  GetFullSpDetails,
  getFullArticle,
  articlesByAuthor,
  getAllNotifications,
  readAllNotifications,
  readSingleNotification,
  deleteNotifications,
  getAllNotificationsLength,
  GetAllPMSServices,
  viewPMSServiceDetails,
  GetSPStats,
  checkSPVerified,
  GetServices,
  getFullEvent,
  viewPackageDetails,
  resolveSpBySubdomain,
  spSubdomainById,
  checkSubdomainAvailable,
} from "../controllers/HomeDataController";

const router = Router();

router.get("/serviceproviders", GetServiceProviders);

router.get("/allarticles", GetArticles);

router.get("/allevents", GetEvents);

router.get("/allvideos", GetVideos);
// router.get("/allservices", GetServices);

router.get("/subprofiles", getSubProfiles);

router.get("/spbycategory", GetServiceProviderByCategory);

router.get("/spdetails", GetFullSpDetails);

router.get("/spstats", GetSPStats);

router.get("/articledetail", getFullArticle);

router.get("/eventdetails", getFullEvent)

router.get("/articlesbyauthor", articlesByAuthor);

router.get("/checkspverified", checkSPVerified);

router.get("/allpmsservices", GetAllPMSServices);

router.get("/viewpmsservicedetails", viewPMSServiceDetails);

router.get("/viewpackagedetails", viewPackageDetails);

router.get("/allnotifications", getAllNotifications);

router.get("/allnotificationslength", getAllNotificationsLength);

router.post("/readnotifications/all", readAllNotifications);

router.post("/readnotifications/single", readSingleNotification);

router.post("/deletenotifications", deleteNotifications);

router.get("/sp-by-subdomain/:sub", resolveSpBySubdomain);

router.get("/sp-subdomain-by-id/:id", spSubdomainById);

router.get("/sp-subdomain-available", checkSubdomainAvailable);

export default {
  routes: router,
};
