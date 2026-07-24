import mongoose, { Schema } from "mongoose";

const LectureSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    duration: { type: Number, default: 0 }, // in seconds or minutes (decide)
    isPreviewFree: { type: Boolean, default: false },
    videoKey: { type: String }, // object key in DO Spaces
    videoUrl: { type: String }, // cached public URL (optional)
    attachments: { type: [String], default: [] }, // legacy: other file keys or URLs
    // PDF, PPT, Excel resources per lecture
    resourceAttachments: {
      type: [
        {
          key: { type: String },
          url: { type: String },
          type: { type: String }, // "pdf" | "ppt" | "xlsx"
          name: { type: String },
        },
      ],
      default: [],
    },
  },
  { _id: true }
);

const SectionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    lectures: { type: [LectureSchema], default: [] },
  },
  { _id: true }
);

const CurriculumSchema = new Schema(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "courses",
      required: true,
      index: true,
    },
    sections: { type: [SectionSchema], default: [] },
  },
  { timestamps: true, versionKey: false }
);

export const CurriculumModel =
  mongoose.models.curricula || mongoose.model("curricula", CurriculumSchema);

export type CurriculumDocument = mongoose.InferSchemaType<
  typeof CurriculumSchema
>;
