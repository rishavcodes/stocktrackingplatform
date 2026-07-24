import { Router, type Request, type Response, type NextFunction } from "express";
import {
  PostNewArticle,
  PostNewEvent,
  PostNewPodcast,
  PostNewVideo,
  deleteArticle,
  getArticleById,
  getAllApprovedEvents,
  getAllArticles,
  getAllEvents,
  getAllPodcasts,
  getAllPreviousArticles,
  getAllPreviousPodcasts,
  getAllPreviousVideos,
  getAllScheduledArticles,
  getAllScheduledPodcasts,
  getAllScheduledVideos,
  getAllVideos,
  streamArticlePDF,
  updateArticle,
} from "../controllers/PostContentController";
import { broadcastQuickMessage } from "../controllers/QuickMessageController";
import { uploadPosts } from "../helpers/postContentFileHelper";
import { verifyUserRATokenMiddleware } from "../middleware/AdminSecurity";
import { verifyArticlePdfShareToken } from "../helpers/articlePdfShareToken";
import {
  PostNewService,
  UpdateService,
  activateService,
  addNewCoupon,
  deactivateService,
  deleteCoupon,
  deleteService,
  getAllCoupons,
  getAllPaidEvents,
  getAllServices,
  getAllServicesForCoupon,
  getPlanAnalytics,
  getCouponByID,
  getDisclaimer,
  getOneService,
  updateCoupon,
} from "../controllers/OurServiceController";

const router = Router();

router.post(
  "/postarticle",
  uploadPosts.fields([{ name: "image" }, { name: "articlePDF" }]),
  PostNewArticle
);

router.post("/postvideo", uploadPosts.single("image"), PostNewVideo);

router.post("/postpodcast", uploadPosts.single("image"), PostNewPodcast);

router.post("/postevent", uploadPosts.single("image"), PostNewEvent);

router.post("/addnewcoupon", addNewCoupon)

router.put("/updatecoupon", updateCoupon)

router.post(
  "/createservice",
  uploadPosts.fields([
    { name: "bannerURL", maxCount: 1 }, // Expect 1 banner image
    { name: "tncFile", maxCount: 1 }, // Expect 1 PDF file
  ]),
  PostNewService
);

router.post("/deactivateservice", deactivateService);

router.post("/activateservice", activateService);

router.delete("/deleteservice", deleteService);

router.put(
  "/updateservice",
  uploadPosts.fields([
    { name: "bannerURL", maxCount: 1 },
    { name: "tncFile", maxCount: 1 },
  ]),
  UpdateService
);

router.get("/fetchService", getOneService);

router.get("/allarticles", getAllArticles);

router.get("/allarticles/previous", getAllPreviousArticles);

router.get("/allarticles/scheduled", getAllScheduledArticles);

router.get("/article", getArticleById);

/**
 * The dashboard hits this route with an `Authorization: Bearer ...` header
 * (NextAuth session). The Telegram link cannot carry that header — Telegram's
 * in-app browser is a fresh context — so it carries a `?t=` short-lived
 * signed token instead. This wrapper accepts whichever is presented.
 *
 * On an invalid / expired token we deliberately fall through to bearer-auth:
 * if the user happens to be logged in via the dashboard, the link still works
 * even after the share token expired.
 */
function articlePdfAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = typeof req.query.t === "string" ? req.query.t : "";
  if (token) {
    const result = verifyArticlePdfShareToken(token, req.params.articleId);
    if (result.ok) {
      (req as any).articlePdfShareAuth = true;
      return next();
    }
  }
  return verifyUserRATokenMiddleware(req, res, next);
}

router.get(
  "/article/pdf/:articleId",
  articlePdfAuth,
  streamArticlePDF
);

router.put(
  "/updatearticle",
  uploadPosts.fields([{ name: "image" }, { name: "articlePDF" }]),
  updateArticle
);

router.delete("/deleteArticles", deleteArticle);

router.get("/allvideos", getAllVideos);

router.get("/allvideos/previous", getAllPreviousVideos);

router.get("/allvideos/scheduled", getAllScheduledVideos);

router.get("/allpodcasts", getAllPodcasts);

router.get("/allpodcasts/previous", getAllPreviousPodcasts);

router.get("/allpodcasts/scheduled", getAllScheduledPodcasts);

router.get("/allevents", getAllEvents);

router.get("/allapprovedevents", getAllApprovedEvents);

router.get("/allpaidevents", getAllPaidEvents)

router.get("/allservices", getAllServices);

router.get("/allservicesforcoupon", getAllServicesForCoupon);

router.get("/plan-analytics", getPlanAnalytics);

router.get("/allcoupons", getAllCoupons);

router.put("/updatecoupon", updateCoupon);

router.delete("/deletecoupons", deleteCoupon);

router.get("/getcoupon", getCouponByID);

router.get("/disclaimer", getDisclaimer);

// Quick message broadcast — SP picks plans, types a message, message is
// posted to each selected plan's Telegram channel. Guarded by auth so only
// the plan owner can use it (also re-checked inside the controller).
// Quick Message — uploadPosts.single("image") puts the optional file at
// req.file (multer-S3 writes the public URL to req.file.location). The
// rest of the form fields stay in req.body as before.
router.post(
  "/quickmessage",
  verifyUserRATokenMiddleware,
  uploadPosts.single("image"),
  broadcastQuickMessage,
);

export default {
  routes: router,
};
