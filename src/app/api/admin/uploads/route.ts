import { getAdmin } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { allow } from "@/lib/ratelimit";
import { MAX_IMAGE_BYTES, UploadError, storeImage } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return fail("Please sign in again.", 401);
  if (!sameOrigin(req)) return fail("Request blocked.", 403);
  if (!(await allow(`upload:${admin.id}`, 60, 10 * 60_000))) return fail("You’re uploading too quickly. Please wait a minute.", 429);

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES + 64 * 1024) return fail("Image is too large. Please use one under 5 MB.", 413);

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    file = f instanceof File ? f : null;
  } catch {
    return fail("That upload didn’t work. Please try again.", 400);
  }
  if (!file) return fail("No file received.", 400);

  try {
    const stored = await storeImage(Buffer.from(await file.arrayBuffer()));
    return json(stored, 201);
  } catch (e) {
    if (e instanceof UploadError) return fail(e.message, 422);
    console.error(JSON.stringify({ evt: "upload_error", msg: e instanceof Error ? e.message : "unknown" }));
    return fail("We couldn’t save that image. Please try again.", 500);
  }
}
