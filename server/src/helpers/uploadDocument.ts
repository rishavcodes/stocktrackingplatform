import multer from "multer";
import multerS3 from "multer-s3";
import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { Request } from "express";
import uniqid from "uniqid";

const S3client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export const uploadDocuments = multer({
  storage: multerS3({
    s3: S3client,
    bucket: process.env.BUCKET_NAME as string,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req: Request, file, cb) {
      if (!file) {
        cb(null);
      }

      try {
        const body = JSON.parse(req.body.data);
        const email = body["email"];
        const regName = body["RegName"];
        const id = uniqid();

        cb(
          null,
          `ServiceProviderCertificates/${regName}-(${email})/${id}-${email}-(${file.fieldname})-${file.originalname}`
        );
      } catch (error) {
        console.log("Error Saving File", error);
      }
    },
  }),
});

export const uploadBufferToS3 = async (
  key: string,
  buffer: Buffer,
  contentType: string
) => {
  const params = {
    Bucket: process.env.BUCKET_NAME as string,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: ObjectCannedACL.public_read,
  };

  await S3client.send(new PutObjectCommand(params));
  console.log(`File uploaded successfully at ${params.Key}`);
};

export const uploadKycDocumentstoS3 = multer({
  storage: multerS3({
    s3: S3client,
    bucket: process.env.BUCKET_NAME as string,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req: Request, file, cb) {
      if (!file) return cb(new Error("File is required"));

      try {
        const userId = req.body?.userId || "unknown-user";
        const fileName = `${userId}/${uniqid()}-${file.originalname}`;
        cb(null, `kyc_documents/${fileName}`);
      } catch (error) {
        console.error("Error Saving File:", error);
        cb(error);
      }
    },
  }),
});

// Utility function to handle buffer uploads manually
export const uploadSignedDocToS3 = async (file: {
  buffer: Buffer;
  mimetype: string;
  session: {
    userId: string;
    serviceId: string;
  };
}): Promise<{ location: string }> => {
  try {
    const { userId, serviceId } = file.session;

    // 🔒 KEEP SAME NAME AS YOU WANT
    const key = `signed/${userId}/${serviceId}.pdf`;

    const uploadParams = {
      Bucket: process.env.BUCKET_NAME as string,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: ObjectCannedACL.public_read, // type-safe
    };

    await S3client.send(new PutObjectCommand(uploadParams));

    return {
      location: `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/${key}`,
    };
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw error;
  }
};

export const uploadPanDocumentsManually = multer({
  storage: multerS3({
    s3: S3client,
    bucket: process.env.BUCKET_NAME as string,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req: Request, file, cb) {
      if (!file) {
        cb(null);
      }

      try {
        // Check if req.body exists and contains data
        if (!req.body || !req.body.data) {
          return cb(new Error("Request body missing required data"));
        }

        const body = JSON.parse(req.body.data);
        const email = body["email"];
        const regName = body["RegName"];
        const id = uniqid();

        if (!body.email || !body.RegName) {
          return cb(
            new Error("Email or registration name missing in request data")
          );
        }

        cb(
          null,
          `ManuallyUploadedPan/${regName}-(${email})/${id}-${email}-(${file.fieldname})-${file.originalname}`
        );
      } catch (error) {
        console.log("Error Saving File", error);
      }
    },
  }),
});

export const uploadPortfolioReport = multer({
  storage: multerS3({
    s3: S3client,
    bucket: process.env.BUCKET_NAME as string,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req: Request, file, cb) {
      if (!file) {
        cb(null);
      }

      try {
        const body = JSON.parse(req.body.data);
        const email = body["email"];
        const regName = body["RegName"];
        const id = uniqid();

        cb(
          null,
          `Portfolio-Reports/${regName}-(${email})/${id}-${email}-(${file.fieldname})-${file.originalname}`
        );
      } catch (error) {
        console.log("Error Saving File", error);
      }
    },
  }),
});

export const uploadThumbnail = multer({
  storage: multerS3({
    s3: S3client,
    bucket: process.env.BUCKET_NAME as string,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req: Request, file, cb) {
      if (!file) {
        cb(null);
      }

      try {
        const body = JSON.parse(req.body.data);
        const title = body["title"];
        const regName = body["RegName"];
        const id = uniqid();

        cb(
          null,
          `Courses/Thumbnails/${title}-(${file.fieldname})-${file.originalname}`
        );
      } catch (error) {
        console.log("Error Saving File", error);
      }
    },
  }),
});
