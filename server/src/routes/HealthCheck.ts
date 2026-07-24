import { Router } from "express";
import { Request, Response } from "express";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "Everything is Fine Here",
  });
});

export default {
  routes: router,
};
