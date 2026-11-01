import { db } from "@/lib/db";

export async function resetDb() {
  await db.$executeRawUnsafe(
    `TRUNCATE "OrderItem","PaymentAttempt","InventoryMovement","Order","ProductImage","Product","Category","AdminSession","AdminUser","LoginAttempt","RateLimitHit","StoreSetting","AuditEvent","Customer","CustomerSession" RESTART IDENTITY CASCADE`,
  );
}

export const customer = {
  name: "Test Buyer",
  email: "buyer@example.com",
  phone: "+91 98765 43210",
};
export const shipping = { line1: "12 Test Street", line2: "", city: "Pune", state: "Maharashtra", postalCode: "411001", country: "IN", notes: "" };

export const makeProduct = (over: Record<string, unknown> = {}) =>
  db.product.create({
    data: { name: "Bamboo Tray", slug: `tray-${Math.random().toString(36).slice(2, 8)}`, pricePaise: 49900, stock: 5, status: "PUBLISHED", ...over },
  });

export const key = () => "idem-" + Math.random().toString(36).slice(2) + Date.now();
