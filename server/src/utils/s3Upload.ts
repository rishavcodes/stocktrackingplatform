import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadFileToS3FromBuffer(
  buffer: Buffer,
  key: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: "application/pdf",
      ACL: "public-read",
    });

    await s3Client.send(command);

    // FIXED: Use hardcoded "ap-south-1" instead of process.env.AWS_REGION
    return `https://${process.env.BUCKET_NAME}.s3.ap-south-1.amazonaws.com/${key}`;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}

