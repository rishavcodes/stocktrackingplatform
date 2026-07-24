import { Router } from "express";
import { verifyUserRATokenMiddleware } from "../middleware/AdminSecurity";
import {
  createSubProfile,
  deleteSubProfile,
  listSubProfiles,
  updateSubProfilePermissions,
} from "../controllers/SubProfileController";

const router = Router();

// All sub-profile management endpoints are gated by:
// 1) verifyUserRATokenMiddleware — must have a valid SP/user/admin token.
// 2) gateMaster() inside the controller — must be a verified Non Individual master.
router.use(verifyUserRATokenMiddleware);

router.get("/subprofiles", listSubProfiles);
router.post("/subprofiles", createSubProfile);
router.patch("/subprofiles/:id/permissions", updateSubProfilePermissions);
router.delete("/subprofiles/:id", deleteSubProfile);

export default {
  routes: router,
};
