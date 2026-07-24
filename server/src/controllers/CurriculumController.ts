import { Request, Response } from "express";
import { CurriculumModel } from "../models/CurriculumModel";
import { CourseModel } from "../models/CourseModel";
import { getPresignedUploadUrl } from "../helpers/spaces";
import { getPresignedDownloadUrl } from "../helpers/spaces";

/**
 * GET /api/v1/instructor/courses/:courseId/curriculum
 */
export const GetCurriculum = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!courseId) {
      return res
        .status(400)
        .json({ success: false, message: "courseId required" });
    }

    // Optional: verify instructor owns course (use req.user)
    // const authUser = (req as any).user;

    const curriculum = await CurriculumModel.findOne({ courseId });

    // If not found, return empty structure
    if (!curriculum) {
      return res.status(200).json({
        success: true,
        data: {
          course: null,
          sections: [],
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        courseId,
        sections: curriculum.sections,
      },
    });
  } catch (err) {
    console.error("GetCurriculum error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/v1/instructor/courses/:courseId/curriculum
 * Body: { sections: [ { _id?, title, order, lectures: [{ _id?, title, order, duration, isPreviewFree, videoKey? }] } ] }
 */
export const UpsertCurriculum = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!courseId) {
      return res
        .status(400)
        .json({ success: false, message: "courseId required" });
    }

    const { sections } = req.body;
    if (!Array.isArray(sections)) {
      return res
        .status(400)
        .json({ success: false, message: "sections array required" });
    }

    // Upsert curriculum doc
    const updated = await CurriculumModel.findOneAndUpdate(
      { courseId },
      { $set: { sections } },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error("UpsertCurriculum error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/v1/instructor/courses/:courseId/lectures/presign
 * Body: { filename, contentType, kind?: "video" | "attachment" }
 * Returns uploadUrl, objectKey, publicUrl
 */
export const PresignLectureUpload = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { filename, contentType, kind } = req.body;

    if (!courseId || !filename || !contentType) {
      return res
        .status(400)
        .json({
          success: false,
          message: "courseId, filename and contentType required",
        });
    }

    const prefix =
      kind === "attachment"
        ? `courses/${courseId}/attachments`
        : `courses/${courseId}/videos`;

    const { uploadUrl, objectKey, publicUrl } = await getPresignedUploadUrl({
      filename,
      contentType,
      prefix,
      expiresIn: 60 * 10,
      acl: kind === "attachment" ? "public-read" : "private",
    });

    return res.status(200).json({
      success: true,
      data: { uploadUrl, objectKey, publicUrl },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("PresignLectureUpload error:", err);
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === "production" ? "Internal server error" : message,
    });
  }
};


/**
 * GET /api/v1/instructor/courses/:courseId/lectures/preview
 * Body/query: { objectKey }  OR path param lectureId to lookup key in DB
 * Returns a presigned GET URL if the caller is authorized.
 */
export const GetLecturePreviewUrl = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    // Prefer receiving lecture identifier or objectKey in query/body
    const { objectKey, lectureId } = req.query as any;

    if (!courseId) {
      return res.status(400).json({ success: false, message: "courseId required" });
    }

    // Auth user (set by your auth middleware)
    const authUser = (req as any).user;

    // 1) Verify access:
    // If instructor preview: allow if authUser.id === course.instructorId
    // If student playback: verify enrollment (you need your enrollment logic)
    const course = await CourseModel.findById(courseId).select("instructorId");
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    const isInstructor = authUser && String(authUser.id) === String(course.instructorId);

    // Example student authorization placeholder:
    const isEnrolled = false; // <-- implement your check: e.g., EnrollmentModel.exists({ courseId, userId: authUser.id })

    if (!isInstructor && !isEnrolled) {
      return res.status(403).json({ success: false, message: "Not authorized to preview this lecture" });
    }

    // 2) Determine the objectKey:
    let key = objectKey as string | undefined;
    if (!key && lectureId) {
      // lookup lecture in curriculum
      const curriculum = await CurriculumModel.findOne({ courseId });
      if (!curriculum) return res.status(404).json({ success: false, message: "Curriculum not found" });

      for (const s of curriculum.sections) {
        const lec = (s as any).lectures?.find((x: any) => String(x._id) === String(lectureId));
        if (lec) {
          key = lec.videoKey;
          break;
        }
      }
    }

    if (!key) {
      return res.status(400).json({ success: false, message: "objectKey or lectureId required" });
    }

    // 3) Generate presigned GET (short lived)
    const presigned = await getPresignedDownloadUrl(key); // 10 minutes

    return res.status(200).json({ success: true, data: { url: presigned, expiresIn: 600 } });
  } catch (err) {
    console.error("GetLecturePreviewUrl error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};