import { Router } from "express";
import { removeUserFromChannel } from "../config/telegram";

const router = Router();

router.post("/remove-user", async (req, res) => {
  const { serviceId, userId, user_id } = req.body;

  if (!serviceId || !userId) {
    return res.status(400).json({ error: "serviceId and userId are required" });
  }

  try {
    await removeUserFromChannel(serviceId, userId, user_id);
    return res.status(200).json({ message: "User removal triggered successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});


export default {
  routes: router,
};
