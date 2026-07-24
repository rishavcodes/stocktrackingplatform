import mongoose, { Schema } from "mongoose";

const LectureProgressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      index: true,
      required: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "courses",
      index: true,
      required: true,
    },
    lectureId: {
      type: Schema.Types.ObjectId,
      index: true,
      required: true,
    },

    watchedSeconds: { type: Number, default: 0 },
    duration: { type: Number, required: true },

    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LectureProgressSchema.index({ userId: 1, lectureId: 1 }, { unique: true });

export const LectureProgressModel =
  mongoose.models.lecture_progress ||
  mongoose.model("lecture_progress", LectureProgressSchema);
