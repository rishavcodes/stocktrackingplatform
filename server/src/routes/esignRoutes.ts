// src/routes/esignRoutes.ts
import { Router } from "express";
import {
  initEsign,
  checkStatus,
  handleCallback,
  getsigneddocument,
  getEsignSession,
  prepareEsign,
} from "../controllers/esignController.js";

const router = Router();

router.post("/init", initEsign);

router.post("/prepare", prepareEsign);

router.get("/status", checkStatus);

router.get("/getsigneddoc", getsigneddocument);

router.get("/callback", handleCallback);

router.get("/session", getEsignSession);

export default {
  routes: router,
};
