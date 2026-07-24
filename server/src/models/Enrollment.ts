import mongoose, { Schema } from "mongoose";

const EnrollmentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "courses",
      required: true,
      index: true,
    },
    orderRef: { type: Schema.Types.ObjectId, ref: "courseorders" }, // link to CourseOrder
    enrolledAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null }, // optional if validity exists
    status: {
      type: String,
      enum: ["active", "expired", "revoked"],
      default: "active",
    },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false }
);

export const EnrollmentModel =
  mongoose.models.enrollments ||
  mongoose.model("enrollments", EnrollmentSchema);

export type EnrollmentDocument = mongoose.InferSchemaType<
  typeof EnrollmentSchema
>;
