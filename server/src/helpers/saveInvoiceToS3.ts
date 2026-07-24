import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import uniqid from "uniqid";

const S3client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export default async function saveInvoiceToS3(
  base64Content: string,
  type: string,
  spName: string,
  fileName: string, // must include extension (.pdf)
) {
  const id = uniqid();

  // Invoice numbers carry a financial-year slash (e.g. "-0516-26/27"). If we
  // include that "/" verbatim in the S3 key, the browser treats it as a path
  // separator on download — the saved filename ends up as "27.pdf-<id>" with
  // no real ".pdf" extension and the OS can't open it. Strip path-creating
  // chars and place the uniqid before the extension so the key ends in ".pdf".
  const sanitize = (s: string) => s.replace(/[\/\\]/g, "-");
  const extMatch = fileName.match(/\.([A-Za-z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : "pdf";
  const base = sanitize(
    extMatch ? fileName.slice(0, -extMatch[0].length) : fileName,
  );
  const safeSp = sanitize(spName);
  const safeFileName = `${base}-${id}.${ext}`;
  const key = `Invoices/${type}/${safeSp}/${safeFileName}`;

  const params = {
    Bucket: process.env.BUCKET_NAME!,
    Key: key,
    Body: Buffer.from(base64Content, "base64"),
    ContentType: "application/pdf",
    // Forces a clean filename when the file is saved from the browser, even
    // for legacy callers that pass odd characters in `fileName`.
    ContentDisposition: `inline; filename="${safeFileName}"`,
    ACL: "public-read" as const,
  };

  try {
    await S3client.send(new PutObjectCommand(params));

    return `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error("Error uploading invoice to S3:", error);
    throw error;
  }
}
