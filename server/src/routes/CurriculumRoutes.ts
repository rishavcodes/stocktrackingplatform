import { Router } from "express";
import {
  GetCurriculum,
  UpsertCurriculum,
  PresignLectureUpload,
  GetLecturePreviewUrl,
} from "../controllers/CurriculumController";
import { verifyUserRATokenMiddleware } from "../middleware/AdminSecurity";

const router = Router();

router.get("/courses/:courseId/getcurriculum", GetCurriculum);

router.put("/courses/:courseId/upsertcurriculum", UpsertCurriculum);

router.post(
  "/courses/:courseId/lectures/presign",
  PresignLectureUpload
);

router.get(
  "/courses/:courseId/lectures/preview",
  verifyUserRATokenMiddleware,
  GetLecturePreviewUrl
);


export default {
  routes: router,
};
