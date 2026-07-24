import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: process.env.DO_SPACES_ENDPOINT,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
});

export async function generateSignedUrl(key: string, expiresInSeconds: number) {
  const command = new GetObjectCommand({
    Bucket: process.env.DO_SPACES_NAME!,
    Key: key,
  });

  return getSignedUrl(s3 as any, command as any, {
    expiresIn: expiresInSeconds,
  });
}
