import { Router } from "express";
import { CreateCourse, DeleteCourse, getAllCourses, GetCourseByIdForEdit, GetCoursePublic, GetInstructorCourses, GetPreviewLectureStream, getRevenueByCourse, getRevenueOrders, getRevenueSummary, publishCourse, UpdateCourse } from "../controllers/CourseController";
import { uploadThumbnail } from "../helpers/uploadDocument";
import { verifyUserRATokenMiddleware } from "../middleware/AdminSecurity";

const router = Router();

router.post(
  "/courses/create",
  uploadThumbnail.single("thumbnail"),
  CreateCourse
);

router.get("/courses/get-all-courses-by-instructorid", GetInstructorCourses);

router.delete("/courses/delete/:id", DeleteCourse);

router.get("/courses/:courseId/edit", GetCourseByIdForEdit);
router.put("/courses/:courseId/update", uploadThumbnail.single("thumbnail"), UpdateCourse);

router.get("/courses/:courseId/public", GetCoursePublic);

router.get("/courses/:courseId/lectures/:lectureId/preview-stream", GetPreviewLectureStream);

router.put("/courses/:courseId/publish", publishCourse);

router.get("/courses/revenue/summary", verifyUserRATokenMiddleware, getRevenueSummary);

router.get(
  "/courses/revenue/by-course",
  verifyUserRATokenMiddleware,
  getRevenueByCourse
);

router.get(
  "/courses/revenue/orders",
  verifyUserRATokenMiddleware,
  getRevenueOrders
);

router.get("/allcourses", getAllCourses);

export default {
  routes: router,
};
