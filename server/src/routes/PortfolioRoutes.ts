import { Router } from "express";
import { createPortfolioController } from "../controllers/portfolio/create";
import {
  getAllPortfoliosController,
  getPortfolioByIdController,
  getPortfoliosByAuthorIdController,
} from "../controllers/portfolio/read";
import { UpdatePortfolioController } from "../controllers/portfolio/update";
import { DeletePortfolioController } from "../controllers/portfolio/delete";
import { uploadPortfolioFiles, uploadTnc } from "../helpers/tncFileHelper";
import { uploadPosts } from "../helpers/postContentFileHelper";

const router = Router();

router.get("/get-portfolio-by-id", getPortfolioByIdController);

router.get("/get-all-portfolios", getAllPortfoliosController);

router.get("/get-portfolios", getPortfoliosByAuthorIdController);

// ✅ Corrected: added `uploadTnc.single("tncFile")` before controller
router.post(
  "/create-portfolio",
  uploadPortfolioFiles.fields([
    { name: "tncFile", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 },
  ]),
  createPortfolioController
);

router.post(
  "/update-portfolio",
  uploadPortfolioFiles.fields([{ name: "bannerImage", maxCount: 1 }]),
  UpdatePortfolioController
);

router.delete("/delete-portfolio/:id", DeletePortfolioController);

export default {
  routes: router,
};
