import { Router } from "express";
import {
  FetchMyRecommendations,
  GetCmp,
  createScoreCard,
  deleteTrade,
  downloadRationalPDF,
  getAllClosedTrades,
  getCMPForTable,
  getClosedTradesSharedWithPlan,
  getLatestScorecards,
  getScorecardDetails,
  getsharedwithplans,
  manualTradeExit,
  modifyScoreCard,
  updateNotes,
} from "../controllers/ScoreCardController";
import { uploadPosts } from "../helpers/postContentFileHelper";
import { upload } from "../helpers/providerRegFileHelper";

const router = Router();

router.get("/getmyrecommendations", FetchMyRecommendations);

router.get("/getsharedwithplans", getsharedwithplans);

router.get("/closedtrades/all", getAllClosedTrades);

router.get("/closedtrades/plan", getClosedTradesSharedWithPlan);

router.get("/scorecards/latest", getLatestScorecards)

// On-demand modal fetch — heavy fields (rational, notes, link, PDFs)
// stripped from the live socket payload to keep per-tick bandwidth tight.
router.get("/:scorecardId/details", getScorecardDetails);

router.post("/getcmp", GetCmp);
router.post("/getcmp/table", getCMPForTable);
router.post("/create", uploadPosts.fields([{ name: "recommendationPDF" }]), createScoreCard);
router.post("/modify/:scorecardId", modifyScoreCard);
// In your routes file
router.post("/:scorecardId/notes", updateNotes);
router.post("/changestatus/manually", manualTradeExit);

router.post("/deletetrade", deleteTrade);





// Download rational PDF route
router.get("/download-rational-pdf/:tradeId", downloadRationalPDF);
export default {
  routes: router,
};
