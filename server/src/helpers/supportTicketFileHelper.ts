import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { Request } from "express";
import uniqid from "uniqid";

const S3client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const uploadSupportAttachments = multer({
  storage: multerS3({
    s3: S3client,
    bucket: process.env.BUCKET_NAME as string,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req: Request, file, cb) {
      try {
        const submitterId =
          (req.body?.submittedById as string) ||
          (req.query?.submittedById as string) ||
          "anon";
        const id = uniqid();
        const safeName = (file.originalname || "image").replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `SupportTickets/${submitterId}/${id}-${safeName}`);
      } catch (error) {
        cb(error as Error, "");
      }
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per image
    files: 5, // max 5 images per ticket
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG/PNG/GIF/WEBP images are allowed"));
    }
  },
});
