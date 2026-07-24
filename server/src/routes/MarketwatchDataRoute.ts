import { Router } from "express";
import {
  GetallSP,
  GetMarketPortfolios,
  GetMarketwatchArticles,
  GetMarketwatchEvents,
  GetMarketwatchServices,
  GetMarketwatchVideos,
} from "../controllers/MarketwatchDataController";

const router = Router();

router.get("/articles", GetMarketwatchArticles);

router.get("/videos", GetMarketwatchVideos);

router.get("/services", GetMarketwatchServices);

router.get("/events", GetMarketwatchEvents);

router.get("/portfolios",GetMarketPortfolios)

router.get("/spProvider",GetallSP)

export default {
  routes: router,
};
