import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { placeOrder, findOrderForCustomer, updateOrderStatus, CheckoutError } from "@/lib/orders";
import { checkoutInput } from "@/lib/validation";
import { customer, key, makeProduct, resetDb, shipping } from "./helpers";

const input = (items: { productId: string; quantity: number }[], idempotencyKey = key()) =>
  checkoutInput.parse({ idempotencyKey, customer, shipping, items });

beforeEach(resetDb);

describe("checkout", () => {
  it("creates an order using database prices, a mock payment, and decrements stock", async () => {
    const p = await makeProduct({ pricePaise: 49900, stock: 5 });
    const res = await placeOrder(input([{ productId: p.id, quantity: 2 }]));
    const order = await db.order.findUniqueOrThrow({ where: { reference: res.reference }, include: { items: true, payments: true } });
    expect(order.subtotalPaise).toBe(99800);
    expect(order.shippingPaise).toBe(5000); // default flat shipping, under free threshold
    expect(order.totalPaise).toBe(104800);
    expect(order.paymentMethod).toBe("MOCK_DEMO");
    expect(order.paymentStatus).toBe("MOCK_CONFIRMED");
    expect(order.payments[0].isMock).toBe(true);
    expect(order.items[0]).toMatchObject({ nameSnapshot: "Bamboo Tray", unitPricePaise: 49900, linePaise: 99800 });
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(3);
    expect(await db.inventoryMovement.count({ where: { orderId: order.id, delta: -2 } })).toBe(1);
  });

  it("applies free shipping over the configured threshold", async () => {
    const p = await makeProduct({ pricePaise: 150000, stock: 5 });
    const res = await placeOrder(input([{ productId: p.id, quantity: 1 }]));
    expect((await db.order.findUniqueOrThrow({ where: { reference: res.reference } })).shippingPaise).toBe(0);
  });

  it("is idempotent: the same key returns the same order and only decrements once", async () => {
    const p = await makeProduct({ stock: 5 });
    const k = key();
    const a = await placeOrder(input([{ productId: p.id, quantity: 1 }], k));
    const b = await placeOrder(input([{ productId: p.id, quantity: 1 }], k));
    expect(b.reference).toBe(a.reference);
    expect(b.duplicate).toBe(true);
    expect(await db.order.count()).toBe(1);
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(4);
  });

  it("handles concurrent identical submissions without duplicates", async () => {
    const p = await makeProduct({ stock: 5 });
    const k = key();
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => placeOrder(input([{ productId: p.id, quantity: 1 }], k))));
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(await db.order.count()).toBe(1);
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(4);
  });

  it("never oversells under concurrent buyers", async () => {
    const p = await makeProduct({ stock: 3 });
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => placeOrder(input([{ productId: p.id, quantity: 1 }]))));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(0);
    expect(await db.order.count()).toBe(3);
  });

  it("rolls back everything when one line is out of stock", async () => {
    const a = await makeProduct({ stock: 5 });
    const b = await makeProduct({ stock: 1 });
    await expect(placeOrder(input([{ productId: a.id, quantity: 2 }, { productId: b.id, quantity: 2 }]))).rejects.toBeInstanceOf(CheckoutError);
    expect((await db.product.findUniqueOrThrow({ where: { id: a.id } })).stock).toBe(5);
    expect(await db.order.count()).toBe(0);
  });

  it("rejects unpublished products and unknown ids", async () => {
    const draft = await makeProduct({ status: "DRAFT" });
    await expect(placeOrder(input([{ productId: draft.id, quantity: 1 }]))).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await expect(placeOrder(input([{ productId: "nope", quantity: 1 }]))).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("validates customer input", () => {
    expect(() => checkoutInput.parse({ idempotencyKey: key(), customer: { ...customer, email: "bad" }, shipping, items: [{ productId: "x", quantity: 1 }] })).toThrow();
    expect(() => checkoutInput.parse({ idempotencyKey: key(), customer, shipping, items: [] })).toThrow();
    expect(() => checkoutInput.parse({ idempotencyKey: key(), customer, shipping, items: [{ productId: "x", quantity: 0 }] })).toThrow();
  });

  it("only exposes an order with the right access token", async () => {
    const p = await makeProduct();
    const res = await placeOrder(input([{ productId: p.id, quantity: 1 }]));
    expect(await findOrderForCustomer(res.reference, res.token!)).not.toBeNull();
    expect(await findOrderForCustomer(res.reference, "wrong")).toBeNull();
    expect(await findOrderForCustomer(res.reference, "")).toBeNull();
  });

  it("keeps order history intact when a product is later changed or removed", async () => {
    const p = await makeProduct({ name: "Original Name", pricePaise: 10000 });
    const res = await placeOrder(input([{ productId: p.id, quantity: 1 }]));
    await db.product.update({ where: { id: p.id }, data: { name: "Renamed", pricePaise: 99999 } });
    await db.product.delete({ where: { id: p.id } });
    const o = await db.order.findUniqueOrThrow({ where: { reference: res.reference }, include: { items: true } });
    expect(o.items[0]).toMatchObject({ nameSnapshot: "Original Name", unitPricePaise: 10000, productId: null });
  });
});

describe("order status", () => {
  async function newOrder() {
    const p = await makeProduct({ stock: 5 });
    const res = await placeOrder(input([{ productId: p.id, quantity: 2 }]));
    const order = await db.order.findUniqueOrThrow({ where: { reference: res.reference } });
    return { p, order };
  }

  it("follows the allowed flow and stores tracking", async () => {
    const { order } = await newOrder();
    await updateOrderStatus(order.id, "PROCESSING");
    const shipped = await updateOrderStatus(order.id, "SHIPPED", "AWB123");
    expect(shipped.trackingReference).toBe("AWB123");
    expect((await updateOrderStatus(order.id, "DELIVERED")).status).toBe("DELIVERED");
  });

  it("blocks nonsensical transitions", async () => {
    const { order } = await newOrder();
    await expect(updateOrderStatus(order.id, "DELIVERED")).rejects.toThrow();
    await updateOrderStatus(order.id, "CANCELLED");
    await expect(updateOrderStatus(order.id, "PROCESSING")).rejects.toThrow();
  });

  it("restocks on cancellation exactly once", async () => {
    const { p, order } = await newOrder();
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(3);
    await updateOrderStatus(order.id, "CANCELLED");
    await updateOrderStatus(order.id, "CANCELLED");
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(5);
  });

  it("never turns a mock payment into a verified one", async () => {
    const { order } = await newOrder();
    await updateOrderStatus(order.id, "PROCESSING");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("MOCK_CONFIRMED");
  });
});

describe("database constraints", () => {
  it("rejects negative stock and negative prices at the database level", async () => {
    await expect(makeProduct({ stock: -1 })).rejects.toThrow();
    await expect(makeProduct({ pricePaise: -5 })).rejects.toThrow();
  });
});
