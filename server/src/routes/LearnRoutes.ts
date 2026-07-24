import express from "express";
import { getCourseForLearn, getCourseProgress, getLectureStream, saveLectureProgress, downloadLectureResource } from "../controllers/LearnController";
import { verifyUserRATokenMiddleware } from "../middleware/AdminSecurity";

const router = express.Router();

router.get("/courses/:courseId/learn", getCourseForLearn);

router.get("/courses/:courseId/progress", verifyUserRATokenMiddleware, getCourseProgress);

router.get(
  "/lectures/:lectureId/stream",
  verifyUserRATokenMiddleware,
  getLectureStream
);

router.get(
  "/courses/:courseId/lectures/:lectureId/resources/download",
  verifyUserRATokenMiddleware,
  downloadLectureResource
);

router.post(
  "/lectures/:lectureId/progress",
  verifyUserRATokenMiddleware,
  saveLectureProgress
);


export default {
  routes: router,
};
