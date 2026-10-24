import { z } from "zod";
import { quoteCart } from "@/lib/cart";
import { fail, json, readJson } from "@/lib/http";
import { allow, clientIp } from "@/lib/ratelimit";

const body = z.object({
  items: z.array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(100) })).max(30),
});

export async function POST(req: Request) {
  if (!(await allow(`quote:${await clientIp()}`, 120, 60_000))) return fail("Too many requests. Please slow down.", 429);
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) return fail("Invalid cart.");
  return json(await quoteCart(parsed.data.items));
}
