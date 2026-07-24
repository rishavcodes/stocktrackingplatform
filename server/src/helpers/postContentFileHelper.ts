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

// No per-file size cap is enforced here. The only remaining body-size
// ceiling is the reverse-proxy `client_max_body_size` directive on the
// hosting boxes — adjust that at the ops layer, not in this file.
export const uploadPosts = multer({
  // Reject obviously-wrong uploads at the door. Without this, a non-PDF
  // uploaded into the articlePDF field gets stored verbatim and later
  // crashes the watermark/stream route with "No PDF header found" when
  // a subscriber opens it. We only police articlePDF here — other fields
  // (image, bannerURL, etc.) accept whatever the existing routes already
  // allow.
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === "articlePDF") {
      const mimeOk = file.mimetype === "application/pdf";
      const extOk = /\.pdf$/i.test(file.originalname || "");
      if (!mimeOk || !extOk) {
        return cb(new Error("articlePDF must be a .pdf file"));
      }
    }
    cb(null, true);
  },
  storage: multerS3({
    s3: S3client,
    bucket: process.env.BUCKET_NAME as string,
    // Article PDFs are streamed via the protected /article/pdf/:articleId
    // route, so they're stored privately on S3. Other fields (banners,
    // post images, etc.) keep public-read so they can render in <img> tags.
    acl: (_req, file, cb) =>
      cb(null, file.fieldname === "articlePDF" ? "private" : "public-read"),
    contentType: multerS3.AUTO_CONTENT_TYPE,

    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    // multer-s3 hangs forever if this callback isn't invoked. The previous
    // version (a) had a fall-through `if (!file) cb(null)` with no `return`,
    // and (b) swallowed any JSON.parse error without ever calling `cb`. Both
    // surfaced as `TypeError("Failed to fetch")` on the browser because the
    // upload stream stalled and the connection eventually closed without a
    // response. Always end with a `cb(...)` call on every code path.
    key: function (req: Request, file, cb) {
      if (!file) {
        return cb(new Error("multer-s3 key called without a file"));
      }

      // Some endpoints (Quick Message broadcast, support tickets, etc.)
      // upload files without the legacy `data` JSON envelope. We try the
      // envelope first for back-compat with research-report uploads, then
      // fall back to authenticated `req.user` info, then to a generic
      // bucket. ANY code path must end with cb() — multer-s3 hangs otherwise.
      try {
        let email = "";
        let regName = "";

        if (typeof req.body?.data === "string" && req.body.data.length > 0) {
          try {
            const parsed = JSON.parse(req.body.data);
            email = parsed?.email || "";
            regName = parsed?.name || "";
          } catch {
            /* fall through to req.user below */
          }
        }

        if (!email || !regName) {
          const u = (req as any).user;
          email = email || u?.email || "anon";
          regName = regName || u?.RegName || u?.name || "anon";
        }

        const id = uniqid();
        return cb(
          null,
          `ServiceProviderPosts/${regName}-(${email})/${id}-${email}-(${file.fieldname})-${file.originalname}`
        );
      } catch (error) {
        console.log("Error generating S3 key for upload", error);
        return cb(error as Error);
      }
    },
  }),
});
