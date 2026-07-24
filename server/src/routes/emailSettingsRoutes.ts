import { Router } from "express";
import {
  getEmailSettings,
  updateEmailSettings,
} from "../controllers/emailSettingsController";

const router = Router();

router.get("/get-settings", getEmailSettings);

router.post("/update-settings", updateEmailSettings);

export default {
  routes: router,
};
