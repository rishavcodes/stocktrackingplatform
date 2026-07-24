import multer from "multer";
import multerS3 from "multer-s3";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Request } from "express";
import uniqid from "uniqid";

const S3client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export const uploadServiceProviderFiles = multer({
  storage: multerS3({
    s3: S3client,
    bucket: process.env.BUCKET_NAME as string,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,

    key: function (req: Request, file, cb) {
      if (!file) return cb(new Error("File is required"));

      try {
        if (!req.body || !req.body.data) {
          return cb(new Error("Request body missing required data"));
        }

        const body = JSON.parse(req.body.data);
        const email = body["email"];
        const regName = body["RegName"];
        const previousPfp = body["prevUrl"];
        const id = uniqid();

        let folder = "";
        if (file.fieldname === "newPfp") {
          folder = "ServiceProviderCertificates";
        } else if (file.fieldname === "investorCharter") {
          folder = "InvestorCharter";
        } else {
          folder = "Misc";
        }

        cb(
          null,
          `${folder}/${regName}-(${email})/${id}-${email}-(${file.fieldname})-${file.originalname}`
        );

        // optional: delete old profile pic if new one uploaded
        if (file.fieldname === "newPfp" && previousPfp) {
          const decodedUrl = decodeURIComponent(previousPfp);
          const baseUrl =
            "https://tradeboxfintech.s3.ap-south-1.amazonaws.com/";
          const keyPath = decodedUrl.substring(
            decodedUrl.indexOf(baseUrl) + baseUrl.length
          );
          // deleteProfile(keyPath); // uncomment if needed
        }
      } catch (error) {
        console.error("Error Saving File:", error);
        cb(error as Error);
      }
    },
  }),
});

export const updateProfileUser = multer({
  storage: multerS3({
    s3: S3client,
    bucket: process.env.BUCKET_NAME as string,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,

    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req: Request, file, cb) {
      if (!file) {
        cb(null);
      }

      const body = JSON.parse(req.body.data);
      const email = body["email"];
      const regName = body["name"];
      // const previousPfp = body["prevUrl"];
      const id = uniqid();

      cb(
        null,
        `Users/${regName}-(${email})/${id}-${email}-(${file.fieldname})-${file.originalname}`
      );

      // const decodedUrl = decodeURIComponent(previousPfp);

      // const baseUrl = "https://tradeboxfintech.s3.ap-south-1.amazonaws.com/";

      // const keyPath = decodedUrl.substring(
      //   decodedUrl.indexOf(baseUrl) + baseUrl.length
      // );

      //   deleteProfile(keyPath);
    },
  }),
});

const deleteProfile = async (key: string) => {
  const deleteParams = {
    Bucket: process.env.BUCKET_NAME as string,
    Key: key,
  };

  try {
    const data = await S3client.send(new DeleteObjectCommand(deleteParams));
    // // console.log("File deleted successfully", data);
  } catch (err) {
    // console.error("Error deleting file:", err);
  }
};
