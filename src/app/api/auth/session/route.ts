import { z } from "zod";
import { startCustomerSession, verifyFirebaseIdToken } from "@/lib/customer-auth";
import { fail, json, readJson, sameOrigin } from "@/lib/http";
import { allow, clientIp } from "@/lib/ratelimit";

const body = z.object({ idToken: z.string().min(100).max(4000) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Request blocked.", 403);
  if (!(await allow(`custauth:${await clientIp()}`, 20, 10 * 60_000))) return fail("Too many attempts. Please try again shortly.", 429);
  const parsed = body.safeParse(await readJson(req, 8_000));
  if (!parsed.success) return fail("Invalid request.");
  const identity = await verifyFirebaseIdToken(parsed.data.idToken);
  if (!identity) return fail("We couldn’t verify your sign-in. Please try again.", 401);
  const c = await startCustomerSession(identity);
  return json({ name: c.name, email: c.email });
}
