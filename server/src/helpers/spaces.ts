// helpers/spaces.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import { randomUUID } from "crypto";

const SPACES_REGION = process.env.DO_SPACES_REGION!;
const SPACES_NAME = process.env.DO_SPACES_NAME!;
const SPACES_ENDPOINT = process.env.DO_SPACES_ENDPOINT!; // e.g. https://sgp1.digitaloceanspaces.com
const PUBLIC_BASE = process.env.DO_SPACES_PUBLIC_BASE_URL!; // CDN or direct base URL

const s3 = new S3Client({
  region: SPACES_REGION,
  endpoint: SPACES_ENDPOINT,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false, // DO works with virtual-hosted style
});

export function makeObjectKey(prefix: string, filename: string) {
  const ext = path.extname(filename) || "";
  const baseName = path.basename(filename, ext) || filename.replace(ext, "");
  const safeName = baseName
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9.\-_]/g, "")
    .slice(0, 200);
  return `${prefix}/${Date.now()}-${randomUUID()}-${safeName}${ext}`;
}

/**
 * Get presigned PUT URL (frontend uploads file directly to DO Spaces).
 * Returns: { uploadUrl, objectKey, publicUrl }
 * Use acl: "public-read" for attachments so stored URL works for enrolled users; keep "private" for videos.
 */
export async function getPresignedUploadUrl({
  filename,
  contentType,
  prefix = "courses/videos",
  expiresIn = 60 * 10, // 10 minutes
  acl,
}: {
  filename: string;
  contentType: string;
  prefix?: string;
  expiresIn?: number;
  acl?: "private" | "public-read";
}) {
  const Key = makeObjectKey(prefix, filename);

  const cmd = new PutObjectCommand({
    Bucket: SPACES_NAME,
    Key,
    ContentType: contentType,
    ACL: acl,
  });

  const uploadUrl = await getSignedUrl(s3 as any, cmd as any, { expiresIn }); // presigned PUT

  // Public URL depends on whether you use CDN or want to sign downloads.
  // If CDN/public, return PUBLIC_BASE/Key
  const publicUrl = `${PUBLIC_BASE}/${Key}`;

  return { uploadUrl, objectKey: Key, publicUrl };
}

/**
 * Optionally create a signed GET URL to serve private objects for short time.
 */
export async function getPresignedDownloadUrl(objectKey: string){
  const cmd = new GetObjectCommand({
    Bucket: SPACES_NAME,
    Key: objectKey,
  });
  const url = await getSignedUrl(s3 as any, cmd as any, { expiresIn: 600 });
  return url;
}

/**
 * Get object from Spaces as a stream (for proxying download with Content-Disposition: attachment).
 */
export async function getObjectStream(objectKey: string): Promise<{ body: NodeJS.ReadableStream | undefined; contentType?: string; contentLength?: number }> {
  const cmd = new GetObjectCommand({
    Bucket: SPACES_NAME,
    Key: objectKey,
  });
  const response = (await s3.send(cmd as any)) as { Body?: NodeJS.ReadableStream; ContentType?: string; ContentLength?: number };
  return {
    body: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
  };
}
