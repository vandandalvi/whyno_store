import { endCustomerSession } from "@/lib/customer-auth";
import { fail, json, sameOrigin } from "@/lib/http";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Request blocked.", 403);
  await endCustomerSession();
  return json({ ok: true });
}
