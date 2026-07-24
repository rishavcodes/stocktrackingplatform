import mongoose, { Schema } from "mongoose";

const CourseSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    subtitle: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    language: {
      type: String,
      enum: ["en", "hi", "other"],
      default: "en",
    },

    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    segment: {
      type: String,
      trim: true,
    },

    keyFeatures: {
      type: [String],
      default: [],
    },

    bonusFeatures: {
      type: [String],
      default: [],
    },

    thumbnailUrl: {
      type: String,
      required: true,
    },

    // Instructor snapshot
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "serviceproviders",
      required: true,
      index: true,
    },

    instructorSnapshot: {
      name: { type: String },
      email: { type: String },
      profileUrl: { type: String },
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },

    shareWithMarketplaces: [
      { type: Schema.Types.ObjectId, ref: "Marketplace" },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
    language_override: false,
  }
);

// Text index (for search)
CourseSchema.index({
  title: "text",
  description: "text",
  segment: "text",
});

// Model
export const CourseModel =
  mongoose.models.courses || mongoose.model("courses", CourseSchema);

// Type for TS
export type CourseDocument = mongoose.InferSchemaType<typeof CourseSchema>;
