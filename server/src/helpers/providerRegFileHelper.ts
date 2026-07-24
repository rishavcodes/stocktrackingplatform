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

export const upload = multer({
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

export async function deleteObject(key: string) {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: key,
  };

  try {
    await S3client.send(new DeleteObjectCommand(params));
    console.log("Object deleted successfully");
  } catch (err) {
    console.error("Error deleting object from S3:", err);
  }
}
