import { Router } from "express";
import {
  getSymbols,
  getExpiries,
  getStrikes,
  getToken,
  triggerSync,
} from "../controllers/ScriptMasterController";

const router = Router();

router.get("/symbols", getSymbols);

router.get("/expiries", getExpiries);

router.get("/strikes", getStrikes);

router.get("/token", getToken);

router.post("/sync", triggerSync);

export default {
  routes: router,
};
