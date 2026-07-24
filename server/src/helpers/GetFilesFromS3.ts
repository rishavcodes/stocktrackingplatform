import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const S3client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});


export default async function (key: string) {
  try { 
    const command = new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME as string,
      Key: key,
    });

    const data = await S3client.send(command);

    return data.Body;
  } catch (error) {
    return null;
  }
}
