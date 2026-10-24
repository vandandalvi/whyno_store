import { NextResponse } from "next/server";

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const fail = (message: string, status = 400, extra: Record<string, unknown> = {}) =>
  json({ error: message, ...extra }, status);

/** Reads a JSON body with a hard size cap. Returns null if invalid or too large. */
export async function readJson(req: Request, maxBytes = 32_000): Promise<unknown | null> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) return null;
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Blocks cross-site browser requests to cookie-authenticated endpoints. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients; they have no ambient cookies
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
