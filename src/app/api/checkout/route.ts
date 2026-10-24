import { CheckoutError, placeOrder } from "@/lib/orders";
import { fail, json, readJson, sameOrigin } from "@/lib/http";
import { allow, clientIp } from "@/lib/ratelimit";
import { checkoutInput } from "@/lib/validation";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Request blocked.", 403);
  if (!(await allow(`checkout:${await clientIp()}`, 10, 10 * 60_000))) {
    return fail("Too many orders from this connection. Please try again in a few minutes.", 429);
  }
  const parsed = checkoutInput.safeParse(await readJson(req));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join(".")] ??= issue.message;
    return fail("Please check the highlighted details.", 422, { fields });
  }
  try {
    const placed = await placeOrder(parsed.data);
    return json({ reference: placed.reference, token: placed.token, duplicate: placed.duplicate }, placed.duplicate ? 200 : 201);
  } catch (e) {
    if (e instanceof CheckoutError) return fail(e.message, 409, { code: e.code });
    console.error(JSON.stringify({ evt: "checkout_error", msg: e instanceof Error ? e.message : "unknown" }));
    return fail("Something went wrong placing your order. You have not been charged. Please try again.", 500);
  }
}
