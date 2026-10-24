import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
};

export async function GET(
  _req: Request,
  props: { params: Promise<{ path: string[] }> }
) {
  const params = await props.params;
  const pathSegments = params.path;

  if (!pathSegments || pathSegments.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Prevent directory traversal attacks
  for (const seg of pathSegments) {
    if (seg === ".." || seg.includes("/") || seg.includes("\\")) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const safeRelPath = pathSegments.join(path.sep);
  const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
  const fullPath = path.resolve(uploadsDir, safeRelPath);

  // Ensure resolved path is strictly inside uploadsDir
  if (!fullPath.startsWith(uploadsDir)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const file = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
