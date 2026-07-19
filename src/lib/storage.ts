import { genId } from "./db/store";
import { logger } from "./logger";

/**
 * Avatar storage abstraction. By default avatars are stored inline as small
 * data URLs (zero external dependencies — great to start). When S3/R2 is
 * configured, images are uploaded to object storage and a public URL is stored
 * instead, keeping database rows small and letting a CDN serve the images.
 *
 * Configure with:
 *   S3_BUCKET, S3_REGION (or S3_ENDPOINT for R2/MinIO),
 *   S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
 *   S3_PUBLIC_URL   (base URL images are served from, e.g. a CDN domain)
 */

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function s3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY &&
      (process.env.S3_REGION || process.env.S3_ENDPOINT)
  );
}

function parseDataUrl(
  dataUrl: string
): { mime: string; body: Buffer } | null {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  return { mime: m[1], body: Buffer.from(m[2], "base64") };
}

/**
 * Persist an avatar image. Accepts a data URL (or ""), returns the value to
 * store on the character: an uploaded object URL when S3 is configured, else
 * the original data URL unchanged.
 */
export async function persistAvatar(dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith("data:")) return dataUrl;
  if (!s3Configured()) return dataUrl; // inline fallback

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return dataUrl;
  const ext = EXT[parsed.mime] || "png";
  const key = `avatars/${genId()}.${ext}`;

  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: parsed.body,
        ContentType: parsed.mime,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    const base = (process.env.S3_PUBLIC_URL || "").replace(/\/$/, "");
    return base ? `${base}/${key}` : key;
  } catch (err) {
    // On any upload failure, fall back to inline storage so character creation
    // still succeeds rather than failing the whole request.
    logger.error("storage.upload_failed", {
      message: (err as Error)?.message,
    });
    return dataUrl;
  }
}
