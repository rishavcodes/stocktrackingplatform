import { Router } from "express";
import { ConnectWhatsapp } from "../controllers/WhatsappController";

const router = Router();

router.post("/connect", ConnectWhatsapp);

export default {
	routes: router,
};
