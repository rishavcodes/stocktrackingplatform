import { Request, Response } from "express";
import { CourseModel } from "../models/CourseModel";
import { CurriculumModel } from "../models/CurriculumModel";
import { CourseOrderModel } from "../models/CourseOrder";
import mongoose from "mongoose";
import { generateSignedUrl } from "../utils/doSpaces";

interface CreateCoursePayload {
  title: string;
  subtitle?: string;
  description: string;
  language: "en" | "hi" | "other";
  level: "beginner" | "intermediate" | "advanced";
  price: number;
  currency: string;
  segment?: string;
  keyFeatures?: string[];
  bonusFeatures?: string[];
  shareWithMarketplaces?: string[];
  instructorId?: string;
  instructorName?: string;
  instructorEmail?: string;
  instructorAvatar?: string;
}

/**
 * @route POST /api/v1/instructor/courses
 * @desc Create a new course (draft) for instructor
 * @access Instructor (authenticated)
 * Expects multipart/form-data:
 *  - data: JSON string (CreateCoursePayload)
 *  - thumbnail: image file
 */
export const CreateCourse = async (req: Request, res: Response) => {
  try {
    const rawData = req.body.data;

    if (!rawData) {
      return res.status(400).json({
        success: false,
        message: "Missing field 'data' in request body.",
      });
    }

    let payload: CreateCoursePayload;

    try {
      payload = JSON.parse(rawData);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON in 'data' field.",
      });
    }

    const {
      title,
      subtitle,
      description,
      language,
      level,
      price,
      currency,
      segment,
      keyFeatures = [],
      bonusFeatures = [],
      shareWithMarketplaces = [],
      instructorId,
      instructorName,
      instructorEmail,
      instructorAvatar,
    } = payload;

    // Basic validation (server-side)
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Course title is required.",
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Course description is required.",
      });
    }

    if (price == null || price < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a non-negative number.",
      });
    }

    const thumbnailFile = req.file;
    if (!thumbnailFile) {
      return res.status(400).json({
        success: false,
        message: "Thumbnail file is required.",
      });
    }

    const file = req.file as Express.MulterS3.File;

    // If you have auth middleware that sets req.user, prefer that
    const authUser = (req as any).user;

    const finalInstructorId = authUser?.id || instructorId || null;

    if (!finalInstructorId) {
      return res.status(400).json({
        success: false,
        message: "InstructorId is required.",
      });
    }

    const shareWithMarketplacesIds = Array.isArray(shareWithMarketplaces)
      ? shareWithMarketplaces
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id))
      : [];

    const course = await CourseModel.create({
      title,
      subtitle,
      description,
      language,
      level,
      price,
      currency,
      segment,
      keyFeatures,
      bonusFeatures,
      shareWithMarketplaces: shareWithMarketplacesIds,
      thumbnailUrl: file ? file.location : "",
      instructorId: finalInstructorId,
      instructorSnapshot: {
        name: instructorName ?? authUser?.RegName ?? authUser?.name,
        email: instructorEmail ?? authUser?.email,
        profileUrl: instructorAvatar ?? authUser?.profileUrl,
      },
      status: "draft",
    });

    return res.status(201).json({
      success: true,
      message: "Course created successfully.",
      data: {
        courseId: course._id,
        course,
      },
    });
  } catch (error) {
    console.error("CreateCourse error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating course.",
    });
  }
};


/**
 * @route GET /api/v1/instructor/courses?instructorId=123
 * @desc List courses belonging to an instructor
 * @access Instructor
 */
export const GetInstructorCourses = async (req: Request, res: Response) => {
  try {
    const instructorId = (req.query.instructorId as string) || null;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: "Instructor ID is required.",
      });
    }

    const courses = await CourseModel.find(
      { instructorId },
      {
        title: 1,
        subtitle: 1,
        thumbnailUrl: 1,
        status: 1,
        price: 1,
        currency: 1,
        createdAt: 1,
      }
    ).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("GetInstructorCourses error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching courses.",
    });
  }
};


/**
 * @route DELETE /api/v1/instructor/courses/:id
 * @desc Delete a course (instructor who owns the course OR admin)
 * @access Instructor (authenticated) OR admin
 */
export const DeleteCourse = async (req: Request, res: Response) => {
  try {
    const courseId = req.params.id;
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course id is required in params.",
      });
    }

    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    // // If you have auth middleware that sets req.user, prefer that
    // const authUser = (req as any).user;

    // // If authUser exists and is not owner, block (unless admin)
    // if (authUser) {
    //   const isOwner =
    //     String(course.instructorId) === String(authUser.id) ||
    //     String(course.instructorId) === String(authUser._id);
    //   const isAdmin = authUser.role && authUser.role === "admin";

    //   if (!isOwner && !isAdmin) {
    //     return res.status(403).json({
    //       success: false,
    //       message: "You are not authorized to delete this course.",
    //     });
    //   }
    // }

    // Hard delete (MVP). If you prefer soft-delete, change this to update status/isDeleted.
    await CourseModel.deleteOne({ _id: courseId });

    // TODO: optionally remove related docs (sections, lectures, reviews) here.

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully.",
    });
  } catch (err) {
    console.error("DeleteCourse error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting course.",
    });
  }
};

/**
 * @route GET /api/v1/courses/:courseId/edit
 * @desc Get a single course by id for editing (instructor)
 */
export const GetCourseByIdForEdit = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!courseId) {
      return res.status(400).json({ success: false, message: "Course id is required." });
    }
    const course = await CourseModel.findById(courseId).lean() as Record<string, any> | null;
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }
    const payload = {
      _id: course._id,
      title: course.title,
      subtitle: course.subtitle || "",
      description: course.description,
      language: course.language,
      level: course.level,
      price: course.price,
      currency: course.currency,
      segment: course.segment || "",
      keyFeatures: course.keyFeatures || [],
      bonusFeatures: course.bonusFeatures || [],
      shareWithMarketplaces: (course.shareWithMarketplaces || []).map((id: any) => String(id)),
      thumbnailUrl: course.thumbnailUrl,
      status: course.status,
    };
    return res.status(200).json({ success: true, data: payload });
  } catch (err) {
    console.error("GetCourseByIdForEdit error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * @route PUT /api/v1/courses/:courseId/update
 * @desc Update course (same fields as create). Multipart: data (JSON), thumbnail (optional).
 */
export const UpdateCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!courseId) {
      return res.status(400).json({ success: false, message: "Course id is required." });
    }
    const rawData = req.body.data;
    if (!rawData) {
      return res.status(400).json({ success: false, message: "Missing field 'data' in request body." });
    }
    let payload: CreateCoursePayload;
    try {
      payload = JSON.parse(rawData);
    } catch {
      return res.status(400).json({ success: false, message: "Invalid JSON in 'data' field." });
    }
    const {
      title,
      subtitle,
      description,
      language,
      level,
      price,
      currency,
      segment,
      keyFeatures = [],
      bonusFeatures = [],
      shareWithMarketplaces = [],
      instructorName,
      instructorEmail,
      instructorAvatar,
    } = payload;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Course title is required." });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: "Course description is required." });
    }
    if (price == null || price < 0) {
      return res.status(400).json({ success: false, message: "Price must be a non-negative number." });
    }

    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const file = req.file as Express.MulterS3.File | undefined;
    const shareWithMarketplacesIds = Array.isArray(shareWithMarketplaces)
      ? shareWithMarketplaces
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id))
      : [];

    course.title = title;
    course.subtitle = subtitle;
    course.description = description;
    course.language = language;
    course.level = level;
    course.price = price;
    course.currency = currency;
    course.segment = segment;
    course.keyFeatures = keyFeatures;
    course.bonusFeatures = bonusFeatures;
    course.shareWithMarketplaces = shareWithMarketplacesIds;
    const snap = (course as any).instructorSnapshot || {};
    if (instructorName !== undefined || instructorEmail !== undefined || instructorAvatar !== undefined) {
      (course as any).instructorSnapshot = {
        ...snap,
        ...(instructorName !== undefined && { name: instructorName }),
        ...(instructorEmail !== undefined && { email: instructorEmail }),
        ...(instructorAvatar !== undefined && { profileUrl: instructorAvatar }),
      };
    }
    if (file && file.location) course.thumbnailUrl = file.location;
    await course.save();

    return res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      data: { course },
    });
  } catch (err) {
    console.error("UpdateCourse error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const GetCoursePublic = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!courseId)
      return res
        .status(400)
        .json({ success: false, message: "courseId required" });

    // find course (only published courses should be available)
    const course = await CourseModel.findById(courseId);
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });

    if (course.status !== "published") {
      return res
        .status(403)
        .json({ success: false, message: "Course not published" });
    }

    // fetch curriculum but strip private fields like videoKey
    const curriculum = await CurriculumModel.findOne({ courseId });
    const sections = (curriculum?.sections || []).map((s: any) => ({
      _id: s._id,
      title: s.title,
      order: s.order,
      lectures: (s.lectures || []).map((l: any) => ({
        _id: l._id,
        title: l.title,
        duration: l.duration,
        isPreviewFree: !!l.isPreviewFree,
        // intentionally omit videoKey/videoUrl
      })),
    }));

    // Prepare instructor snapshot (do not expose sensitive fields)
    const instructor = course.instructorId
      ? {
          _id: course.instructorId,
          name: course.instructorName || course.instructorSnapshot?.name,
          profileUrl: course.instructorSnapshot.profileUrl || null,
          email: course.instructorSnapshot.email,
        }
      : null;

    const payload = {
      _id: course._id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      price: course.price,
      currency: course.currency,
      level: course.level,
      language: course.language,
      keyFeatures: course.keyFeatures,
      bonusFeatures: course.bonusFeatures,
      instructor,
      faqs: course.faqs || [],
      disclaimer: course.disclaimer || "",
      sections,
      createdAt: course.createdAt,
    };

    console.log(payload)

    return res.status(200).json({ success: true, data: payload });
  } catch (err) {
    console.error("GetCoursePublic error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const PREVIEW_STREAM_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * GET /api/v1/courses/:courseId/lectures/:lectureId/preview-stream
 * Public endpoint: returns a signed video URL only for lectures marked isPreviewFree.
 * No auth required.
 */
export const GetPreviewLectureStream = async (req: Request, res: Response) => {
  try {
    const { courseId, lectureId } = req.params;
    if (!courseId || !lectureId) {
      return res.status(400).json({ success: false, message: "courseId and lectureId required" });
    }
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(lectureId)) {
      return res.status(400).json({ success: false, message: "Invalid course or lecture id" });
    }

    const course = await CourseModel.findById(courseId).select("status");
    if (!course || course.status !== "published") {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const curriculum = await CurriculumModel.findOne({ courseId });
    if (!curriculum) {
      return res.status(404).json({ success: false, message: "Curriculum not found" });
    }

    let lecture: { isPreviewFree?: boolean; videoKey?: string } | null = null;
    for (const s of (curriculum.sections || []) as any[]) {
      const lec = (s.lectures || []).find((l: any) => String(l._id) === String(lectureId));
      if (lec) {
        lecture = lec;
        break;
      }
    }

    if (!lecture || !lecture.isPreviewFree || !lecture.videoKey) {
      return res.status(403).json({ success: false, message: "Preview not available for this lecture" });
    }

    const videoUrl = await generateSignedUrl(lecture.videoKey, PREVIEW_STREAM_EXPIRY_SECONDS);
    return res.status(200).json({
      success: true,
      data: { videoUrl, expiresIn: PREVIEW_STREAM_EXPIRY_SECONDS },
    });
  } catch (err) {
    console.error("GetPreviewLectureStream error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const publishCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    // 1️⃣ Validate course exists
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // 2️⃣ Ensure user trying to publish is the course owner (optional but recommended)
    if (req.user?.id && course.instructorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to publish this course",
      });
    }

    // 3️⃣ Ensure curriculum exists
    const curriculum = await CurriculumModel.findOne({ courseId });
    if (!curriculum || curriculum.sections.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot publish course without curriculum",
      });
    }

    // 4️⃣ Validate each section & lecture has required fields
    for (const section of curriculum.sections) {
      if (!section.title || section.title.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Each section must have a title before publishing",
        });
      }

      if (!section.lectures || section.lectures.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Each section must contain at least one lecture",
        });
      }

      for (const lecture of section.lectures) {
        if (!lecture.title) {
          return res.status(400).json({
            success: false,
            message: "Every lecture must have a title",
          });
        }

        if (!lecture.videoKey) {
          return res.status(400).json({
            success: false,
            message:
              "Lecture video missing. Upload video for all lectures before publishing.",
          });
        }
      }
    }

    // 5️⃣ Finally publish the course
    course.status = "published";
    course.publishedAt = new Date();
    await course.save();

    return res.json({
      success: true,
      message: "Course published successfully!",
    });
  } catch (err: any) {
    console.error("publishCourse error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const getRevenueSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Convert userId to ObjectId if it's a string
    const instructorObjectId = new mongoose.Types.ObjectId(userId);

    const result = await CourseOrderModel.aggregate([
      // ✅ Only successful payments (don't filter by courseId here)
      {
        $match: {
          status: "paid",
        },
      },

      // 🔗 Join courses
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },

      // 🎯 Only courses owned by this instructor
      {
        $match: {
          "course.instructorId": instructorObjectId,
        },
      },

      {
        $facet: {
          // 📊 Overall lifetime metrics
          overall: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                grossRevenue: { $sum: "$total" }, // incl GST
                netRevenue: { $sum: "$subtotal" }, // instructor revenue
                totalGST: { $sum: "$gst" },
              },
            },
          ],

          // 📅 Current month metrics
          thisMonth: [
            {
              $match: {
                createdAt: { $gte: startOfMonth },
              },
            },
            {
              $group: {
                _id: null,
                grossRevenue: { $sum: "$total" },
                netRevenue: { $sum: "$subtotal" },
              },
            },
          ],
        },
      },
    ]);

    const overall = result[0]?.overall[0] || {};
    const thisMonth = result[0]?.thisMonth[0] || {};

    const totalOrders = overall.totalOrders || 0;
    const grossRevenue = overall.grossRevenue || 0;
    const netRevenue = overall.netRevenue || 0;

    return res.json({
      totalOrders,
      grossRevenue, // total (incl GST)
      netRevenue, // subtotal (creator revenue)
      totalGST: overall.totalGST || 0,
      averageOrderValue:
        totalOrders > 0 ? Math.round(grossRevenue / totalOrders) : 0,
      thisMonthRevenue: thisMonth.grossRevenue || 0, // Fixed: was thisMonth.revenue
    });
  } catch (error) {
    console.error("Revenue summary error:", error);
    return res.status(500).json({
      message: "Failed to fetch revenue summary",
    });
  }
};

export const getRevenueByCourse = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const instructorObjectId = new mongoose.Types.ObjectId(userId);

    const result = await CourseOrderModel.aggregate([
      // ✅ only paid orders
      {
        $match: {
          status: "paid",
        },
      },

      // 🔗 join course
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },

      // 🎯 only instructor's courses
      {
        $match: {
          "course.instructorId": instructorObjectId,
        },
      },

      // 📊 group by course
      {
        $group: {
          _id: "$course._id",
          title: { $first: "$course.title" },
          price: { $first: "$course.price" },

          orders: { $sum: 1 },
          revenue: { $sum: "$subtotal" }, // NET revenue
        },
      },

      // 🔽 sort by revenue desc
      {
        $sort: { revenue: -1 },
      },
    ]);

    return res.json({
      success: true,
      rows: result.map((r) => ({
        courseId: r._id,
        title: r.title,
        price: r.price,
        orders: r.orders,
        revenue: r.revenue,
      })),
    });
  } catch (error) {
    console.error("Revenue by course error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch revenue by course",
    });
  }
};

export const getRevenueOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const instructorObjectId = new mongoose.Types.ObjectId(userId);

    const orders = await CourseOrderModel.aggregate([
      // ✅ only paid orders
      {
        $match: {
          status: "paid",
        },
      },

      // 🔗 join course
      { 
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },

      // 🎯 instructor filter
      {
        $match: {
          "course.instructorId": instructorObjectId,
        },
      },

      // 🔗 join buyer
      {
        $lookup: {
          from: "users",
          localField: "buyerId",
          foreignField: "_id",
          as: "buyer",
        },
      },
      { $unwind: "$buyer" },

      // 📦 shape response
      {
        $project: {
          _id: 0,
          id: "$razorpayPaymentId",
          courseTitle: "$course.title",
          buyerName: "$buyer.name",
          buyerPhone: "$buyer.number",
          buyerEmail: "$buyer.email",
          amount: "$total",
          createdAt: 1,
        },
      },

      // 🕒 latest first
      { $sort: { createdAt: -1 } },

      // 🔢 limit (pagination later)
      { $limit: 20 },
    ]);

    return res.json({
      success: true,
      orders: orders.map((o) => ({
        ...o,
        date: o.createdAt,
      })),
    });
  } catch (error) {
    console.error("Revenue orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch revenue orders",
    });
  }
};


// controllers/courseController.ts

export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Service provider ID is required",
      });
    }

    // Find all courses for this instructor, sorted by creation date
    const courses = await CourseModel.find({ instructorId: id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: courses,
    });
    
  } catch (error) {
    console.error("Error in getAllCourses:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching courses",
    });
  }
};