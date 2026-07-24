// models/CourseProgress.ts
import mongoose, { Schema } from "mongoose";

const CourseProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, required: true, index: true },

    lastLectureId: { type: Schema.Types.ObjectId },
    lastWatchedSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CourseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const CourseProgressModel =
  mongoose.models.courseprogress ||
  mongoose.model("courseprogress", CourseProgressSchema);
