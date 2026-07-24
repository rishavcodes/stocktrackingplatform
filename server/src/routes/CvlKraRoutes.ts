import { Router } from "express";
import { checkCvlKra } from "../controllers/CvlKra/cvlKraController";
import {
  getCvlKraCredentials,
  saveCvlKraCredentials,
  testCvlKraConnection,
} from "../controllers/CvlKra/cvlKraCredentialsController";
import { verifyUserRATokenMiddleware } from "../middleware/AdminSecurity";

const router = Router();

// Per-provider CVL KRA credential management (My Profile -> KRA Integration)
router.get("/credentials", verifyUserRATokenMiddleware, getCvlKraCredentials);
router.post(
  "/credentials/save",
  verifyUserRATokenMiddleware,
  saveCvlKraCredentials,
);
router.post(
  "/credentials/test",
  verifyUserRATokenMiddleware,
  testCvlKraConnection,
);

// Fetch a subscriber's full KYC record using the provider's own credentials
router.post("/check", verifyUserRATokenMiddleware, checkCvlKra);

export default {
  routes: router,
};
