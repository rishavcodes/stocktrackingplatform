import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Request } from "express";
import uniqid from "uniqid";

const S3client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export const uploadPaymentProof = multer({
  storage: multerS3({
    s3: S3client,
    bucket: process.env.BUCKET_NAME as string,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req: Request, file, cb) {
      // Handle missing file
      if (!file) {
        return cb(new Error("No file provided"), "");
      }

      let email = "unknown";
      let regName = "unknown";

      try {
        if (req.body.data) {
          const body = JSON.parse(req.body.data);
          // Support both formats: direct fields or order fields
          email = body.orderByEmail || body.email || "unknown";
          regName = body.orderByName || body.RegName || "unknown";
        }
      } catch (error) {
        console.log("Error parsing req.body.data", error);
      }

      // Ensure callback always executes
      cb(
        null,
        `Users/${regName}-(${email})/${uniqid()}-${email}-(${file.fieldname})-${
          file.originalname
        }`
      );
    },
  }),
});

