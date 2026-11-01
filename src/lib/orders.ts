import { createHash, randomBytes, randomInt } from "node:crypto";
import { Prisma, type OrderStatus } from "@prisma/client";
import { db } from "./db";
import { getSettings, shippingFor } from "./settings";
import type { CheckoutInput } from "./validation";

export class CheckoutError extends Error {
  constructor(message: string, public code: "STOCK" | "UNAVAILABLE" | "INVALID" = "INVALID") {
    super(message);
  }
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newReference = () => "WH-" + Array.from({ length: 8 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("");
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export type PlacedOrder = { reference: string; token: string | null; duplicate: boolean };

/**
 * Creates an order. Prices always come from the database, never from the browser.
 * Stock is decremented with a conditional UPDATE, so concurrent buyers can't oversell.
 * The idempotency key makes retries / double-clicks return the same order.
 */
export async function placeOrder(input: CheckoutInput, customerId?: string | null): Promise<PlacedOrder> {
  const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return { reference: existing.reference, token: null, duplicate: true };

  // Merge duplicate lines, sort for a stable lock order.
  const wanted = new Map<string, number>();
  for (const l of input.items) wanted.set(l.productId, (wanted.get(l.productId) ?? 0) + l.quantity);
  const lines = [...wanted.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (lines.some(([, q]) => q > 20)) throw new CheckoutError("Maximum 20 of one item per order.");

  const settings = await getSettings();
  const token = randomBytes(24).toString("base64url");

  try {
    const order = await db.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: lines.map(([id]) => id) } },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      });
      const byId = new Map(products.map((p) => [p.id, p]));
      let subtotal = 0;
      const items: Prisma.OrderItemCreateWithoutOrderInput[] = [];
      for (const [id, qty] of lines) {
        const p = byId.get(id);
        if (!p || p.status !== "PUBLISHED") throw new CheckoutError("An item in your cart is no longer available.", "UNAVAILABLE");
        const upd = await tx.product.updateMany({ where: { id, stock: { gte: qty } }, data: { stock: { decrement: qty } } });
        if (upd.count !== 1) throw new CheckoutError(`Sorry, we don't have enough "${p.name}" in stock.`, "STOCK");
        const line = p.pricePaise * qty;
        subtotal += line;
        items.push({
          product: { connect: { id } },
          nameSnapshot: p.name,
          skuSnapshot: p.sku,
          imageSnapshot: p.images[0]?.url ?? null,
          unitPricePaise: p.pricePaise,
          quantity: qty,
          linePaise: line,
        });
      }
      const shipping = shippingFor(subtotal, settings);
      const total = subtotal + shipping;
      const created = await tx.order.create({
        data: {
          reference: newReference(),
          idempotencyKey: input.idempotencyKey,
          accessTokenHash: sha256(token),
          customerId: customerId ?? null,
          customerName: input.customer.name,
          customerEmail: input.customer.email.toLowerCase(),
          customerPhone: input.customer.phone,
          shipLine1: input.shipping.line1,
          shipLine2: input.shipping.line2,
          shipCity: input.shipping.city,
          shipState: input.shipping.state,
          shipPostalCode: input.shipping.postalCode,
          shipCountry: input.shipping.country || "IN",
          deliveryNotes: input.shipping.notes,
          subtotalPaise: subtotal,
          shippingPaise: shipping,
          totalPaise: total,
          currency: settings.currency,
          paymentMethod: "MOCK_DEMO",
          paymentStatus: "MOCK_CONFIRMED",
          items: { create: items },
          payments: { create: { method: "MOCK_DEMO", status: "MOCK_CONFIRMED", amountPaise: total, isMock: true } },
        },
      });
      await tx.inventoryMovement.createMany({
        data: lines.map(([productId, q]) => ({ productId, orderId: created.id, delta: -q, reason: "ORDER_PLACED" as const })),
      });
      return created;
    });
    return { reference: order.reference, token, duplicate: false };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (again) return { reference: again.reference, token: null, duplicate: true };
    }
    throw e;
  }
}

export async function findOrderForCustomer(reference: string, token: string) {
  const order = await db.order.findUnique({ where: { reference }, include: { items: true } });
  if (!order || !token || order.accessTokenHash !== sha256(token)) return null;
  return order;
}

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export class OrderUpdateError extends Error {}

export async function updateOrderStatus(id: string, next: OrderStatus, tracking?: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new OrderUpdateError("Order not found.");
    if (next !== order.status && !ALLOWED_TRANSITIONS[order.status].includes(next)) {
      throw new OrderUpdateError(`An order that is ${order.status.toLowerCase()} can't be changed to ${next.toLowerCase()}.`);
    }
    if (next === "CANCELLED" && next !== order.status) {
      for (const it of order.items) {
        if (!it.productId) continue;
        await tx.product.updateMany({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } });
        await tx.inventoryMovement.create({ data: { productId: it.productId, orderId: id, delta: it.quantity, reason: "ORDER_CANCELLED" } });
      }
    }
    return tx.order.update({
      where: { id },
      data: { status: next, ...(tracking !== undefined ? { trackingReference: tracking.slice(0, 120) } : {}) },
    });
  });
}
