import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

const REQUIRED = { R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID, R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME: BUCKET, R2_PUBLIC_URL: PUBLIC_URL };
const missing = Object.entries(REQUIRED).filter(([, v]) => !v).map(([k]) => k);
if (missing.length > 0) throw new Error(`Missing R2 env vars: ${missing.join(', ')}`);

/** Upload a buffer to R2 and return the public URL. */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `${PUBLIC_URL}/${key}`;
}

/** Delete an object from R2 by key. */
export async function deleteFromR2(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

/** Derive the two R2 keys for a given pin/image ID pair. */
export function r2Keys(pinId: string, imageId: string) {
  return {
    full: `images/${pinId}/${imageId}/full.webp`,
    thumb: `images/${pinId}/${imageId}/thumb.webp`,
  };
}
