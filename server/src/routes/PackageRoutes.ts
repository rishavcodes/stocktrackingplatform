import { Router } from "express";
import { uploadPosts } from "../helpers/postContentFileHelper";
import { createPackage, deletePackage, getMyPackages, getPackageDetails, updatePackage } from "../controllers/PackageController";
import { verifyUserRATokenMiddleware } from "../middleware/AdminSecurity";

const router = Router();

router.post(
  "/package/create",
  verifyUserRATokenMiddleware,
  uploadPosts.fields([
    { name: "bannerURL", maxCount: 1 },
    { name: "tncFile", maxCount: 1 },
  ]),
  createPackage
);

router.put("/package/update", verifyUserRATokenMiddleware, uploadPosts.fields([
  { name: "bannerURL", maxCount: 1 },
  { name: "tncFile", maxCount: 1 },
]), updatePackage);

router.get("/package/mypackages",  getMyPackages);

router.get("/package/details", verifyUserRATokenMiddleware, getPackageDetails);

router.delete("/package/delete", verifyUserRATokenMiddleware, deletePackage);

export default {
  routes: router,
};
