import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { imageSize } from "image-size";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type StoredImage = { url: string; objectKey: string; width: number | null; height: number | null };

/** Detects the real type from the file signature rather than trusting the client's header. */
export function sniffImage(buf: Buffer): keyof typeof TYPES | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export class UploadError extends Error {}

export function validateImage(buf: Buffer): { type: keyof typeof TYPES; width: number; height: number } {
  if (buf.length === 0) throw new UploadError("That file is empty.");
  if (buf.length > MAX_IMAGE_BYTES) throw new UploadError("Image is too large. Please use one under 5 MB.");
  const type = sniffImage(buf);
  if (!type) throw new UploadError("Please upload a JPG, PNG or WebP image.");
  let dims: { width?: number; height?: number };
  try {
    dims = imageSize(buf);
  } catch {
    throw new UploadError("That file doesn't look like a valid image.");
  }
  const { width, height } = dims;
  if (!width || !height) throw new UploadError("That file doesn't look like a valid image.");
  if (width < 200 || height < 200) throw new UploadError("Image is too small. Please use one at least 200×200 pixels.");
  if (width > 8000 || height > 8000) throw new UploadError("Image is too large in pixels (max 8000×8000).");
  return { type, width, height };
}

const account = () => process.env.AZURE_STORAGE_ACCOUNT_NAME;
const container = () => process.env.AZURE_STORAGE_CONTAINER_NAME ?? "product-images";

async function blobContainer() {
  const { BlobServiceClient } = await import("@azure/storage-blob");
  const { DefaultAzureCredential } = await import("@azure/identity");
  const svc = new BlobServiceClient(`https://${account()}.blob.core.windows.net`, new DefaultAzureCredential());
  return svc.getContainerClient(container());
}

/** Stores a validated image. Unique object names mean browsers never see stale images. */
export async function storeImage(buf: Buffer): Promise<StoredImage> {
  const { type, width, height } = validateImage(buf);
  const objectKey = `products/${new Date().getUTCFullYear()}/${randomUUID()}.${TYPES[type]}`;

  if (account()) {
    const blob = (await blobContainer()).getBlockBlobClient(objectKey);
    await blob.uploadData(buf, {
      blobHTTPHeaders: { blobContentType: type, blobCacheControl: "public, max-age=31536000, immutable" },
    });
    return { url: blob.url, objectKey, width, height };
  }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_UPLOADS !== "1") throw new Error("Image storage is not configured");
  const file = path.join(process.cwd(), "public", "uploads", objectKey);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buf);
  return { url: `/uploads/${objectKey}`, objectKey, width, height };
}

export async function deleteImage(objectKey: string) {
  try {
    if (account()) await (await blobContainer()).deleteBlob(objectKey);
    else if (process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_UPLOADS === "1") await fs.rm(path.join(process.cwd(), "public", "uploads", objectKey), { force: true });
  } catch {
    // Orphaned files are harmless; never fail a product save because of cleanup.
  }
}
