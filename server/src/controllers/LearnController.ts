import mongoose from "mongoose";
import { Request, Response } from "express";
import { CourseModel } from "../models/CourseModel";
import { CurriculumModel } from "../models/CurriculumModel";
import { checkUserPurchase } from "../utils/checkUserPurchase";
import { generateSignedUrl } from "../utils/doSpaces";
import { getObjectStream } from "../helpers/spaces";
import { LectureProgressModel } from "../models/LectureProgress";
import { CourseProgressModel } from "../models/CourseProgress";

export async function getCourseForLearn(req: Request, res: Response) {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Invalid course id" });
    }

    // 1️⃣ Fetch course basic info
    const course = await CourseModel.findById(courseId)
    //   .select({ title: 1, status: 1 });

    if (!course || course.status !== "published") {
      return res.status(404).json({ message: "Course not found" });
    }

    // 2️⃣ Fetch curriculum
    const curriculum = await CurriculumModel.findOne({
      courseId: course._id,
    })
    //   .select({
    //     sections: {
    //       title: 1,
    //       lectures: {
    //         title: 1,
    //         duration: 1,
    //         isPreviewFree: 1,
    //       },
    //     },
    //   });

    return res.json({
      _id: course._id,
      title: course.title,
      sections: curriculum?.sections || [],
    });
  } catch (error) {
    console.error("GET /courses/:courseId/learn", error);
    return res.status(500).json({
      message: "Failed to load course",
    });
  }
}


export async function getLectureStream(req: Request, res: Response) {
  try {
    const { lectureId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(lectureId)) {
      return res.status(400).json({ message: "Invalid lecture id" });
    }

    // 1️⃣ Find curriculum containing this lecture
    const curriculum = await CurriculumModel.findOne({
      "sections.lectures._id": lectureId,
    });

    if (!curriculum) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    // 2️⃣ Extract the lecture
    let lecture: any = null;

    for (const section of curriculum.sections) {
      lecture = section.lectures.find(
        (l: any) => l._id.toString() === lectureId
      );
      if (lecture) break;
    }

    if (!lecture || !lecture.videoKey) {
      return res.status(404).json({ message: "Video not available" });
    }

    // 3️⃣ Authorization check
    let allowed = false;

    if (lecture.isPreviewFree) {
      allowed = true;
    } else {
      // 🔒 check purchase
      const hasPurchased = await checkUserPurchase(userId, curriculum.courseId);

      if (hasPurchased) allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({
        message: "You do not have access to this lecture",
      });
    }

    // 4️⃣ Generate signed URL (5 minutes)
    const videoUrl = await generateSignedUrl(lecture.videoKey, 300);

    return res.json({ videoUrl });
  } catch (error) {
    console.error("GET /lectures/:lectureId/stream", error);
    return res.status(500).json({
      message: "Failed to load lecture video",
    });
  }
}

export async function saveLectureProgress(req: Request, res: Response) {
  const userId = req.user.id;
  const { lectureId } = req.params;
  const { watchedSeconds, duration, completed } = req.body;

  // 1️⃣ Find courseId
  const curriculum = await CurriculumModel.findOne({
    "sections.lectures._id": lectureId,
  }).select("courseId");

  if (!curriculum) {
    return res.status(404).json({ message: "Lecture not found" });
  }

  const courseId = curriculum.courseId;

  // 2️⃣ Update lecture progress
  await LectureProgressModel.findOneAndUpdate(
    { userId, lectureId },
    {
      userId,
      courseId,
      lectureId,
      watchedSeconds,
      duration,
      isCompleted: completed === true,
    },
    { upsert: true }
  );

  // 3️⃣ Update course progress (resume)
  await CourseProgressModel.findOneAndUpdate(
    { userId, courseId },
    {
      lastLectureId: lectureId,
      lastWatchedSeconds: watchedSeconds,
    },
    { upsert: true }
  );

  return res.json({ success: true });
}

export async function getCourseProgress(req: Request, res: Response) {
  const userId = req.user.id;
  const { courseId } = req.params;

  const [courseProgress, lectureProgress] = await Promise.all([
    CourseProgressModel.findOne({ userId, courseId }),
    LectureProgressModel.find({ userId, courseId }),
  ]);

  return res.json({
    resume: courseProgress
      ? {
          lectureId: courseProgress.lastLectureId,
          seconds: courseProgress.lastWatchedSeconds,
        }
      : null,

    completedLectureIds: lectureProgress
      .filter((l) => l.isCompleted)
      .map((l) => l.lectureId),

    lectureProgress, // optional: for analytics / UI
  });
}

/**
 * GET /api/v1/courses/:courseId/lectures/:lectureId/resources/download?key=...
 * Streams the lecture resource file with Content-Disposition: attachment so it downloads (no new tab).
 * Requires auth + enrollment.
 */
export async function downloadLectureResource(req: Request, res: Response) {
  try {
    const { courseId, lectureId } = req.params;
    const { key } = req.query;
    const userId = (req as any).user?.id;

    if (!userId || !key || typeof key !== "string") {
      return res.status(400).json({ message: "Missing key or auth" });
    }
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(lectureId)) {
      return res.status(400).json({ message: "Invalid course or lecture id" });
    }

    const course = await CourseModel.findById(courseId).select("status");
    if (!course || course.status !== "published") {
      return res.status(404).json({ message: "Course not found" });
    }

    const hasPurchased = await checkUserPurchase(userId, courseId);
    if (!hasPurchased) {
      return res.status(403).json({ message: "You must be enrolled to download resources" });
    }

    const curriculum = await CurriculumModel.findOne({ courseId });
    if (!curriculum) {
      return res.status(404).json({ message: "Curriculum not found" });
    }

    let lecture: any = null;
    for (const s of curriculum.sections || []) {
      const lec = (s as any).lectures?.find((l: any) => l._id.toString() === lectureId);
      if (lec) {
        lecture = lec;
        break;
      }
    }
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    const resourceAttachments = lecture.resourceAttachments || [];
    const attachment = resourceAttachments.find((a: any) => a.key === key);
    if (!attachment) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const { body, contentType } = await getObjectStream(key);
    if (!body) {
      return res.status(404).json({ message: "File not available" });
    }

    const filename = (attachment.name || "download").replace(/["\\\r\n]/g, "");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    if (contentType) res.setHeader("Content-Type", contentType);
    (body as NodeJS.ReadableStream).pipe(res);
    return;
  } catch (error) {
    console.error("downloadLectureResource error:", error);
    return res.status(500).json({ message: "Failed to download resource" });
  }
}
