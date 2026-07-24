import { Router } from "express";
import { getProteanTemplates } from "../controllers/ProteanController";

const router = Router();

router.post("/templates", getProteanTemplates);



export default {
  routes: router,
};
