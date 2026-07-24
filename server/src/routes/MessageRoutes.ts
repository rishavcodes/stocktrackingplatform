import { Router } from "express";
import {
  getPrevConvos,
  getprofile,
  searchMembers,
} from "../controllers/MessageController";

const router = Router();

router.get("/search", searchMembers);

router.get("/getprofile", getprofile);

router.get("/getprevconvos", getPrevConvos);

export default {
  routes: router,
};
