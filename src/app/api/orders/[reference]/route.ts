import { fail, json } from "@/lib/http";
import { findOrderForCustomer } from "@/lib/orders";
import { allow, clientIp } from "@/lib/ratelimit";

// Order lookup requires the secret token issued at checkout; the reference alone is not enough.
export async function GET(req: Request, { params }: { params: Promise<{ reference: string }> }) {
  if (!(await allow(`order:${await clientIp()}`, 30, 60_000))) return fail("Too many requests.", 429);
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const o = await findOrderForCustomer((await params).reference, token);
  if (!o) return fail("Order not found.", 404);
  return json({
    reference: o.reference, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus,
    totalPaise: o.totalPaise, currency: o.currency, trackingReference: o.trackingReference,
    items: o.items.map((i) => ({ name: i.nameSnapshot, quantity: i.quantity, linePaise: i.linePaise })),
  });
}
