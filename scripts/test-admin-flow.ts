import { randomBytes, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { verify } from "@node-rs/argon2";

const db = new PrismaClient();
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const BASE = "http://localhost:4100";

async function main() {
  console.log("--- 1. Testing Admin Credentials in DB ---");
  const email = "admin@whyno.tech";
  const user = await db.adminUser.findUnique({ where: { email } });
  if (!user) throw new Error("Admin user not found in database");
  const passOk = await verify(user.passwordHash, "WhynoAdmin2026!");
  if (!passOk) throw new Error("Admin password verification failed");
  console.log("✓ Admin user credentials verified successfully with Argon2id");

  console.log("\n--- 2. Creating Admin Session ---");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 8 * 3600 * 1000);
  await db.adminSession.create({
    data: { tokenHash: sha256(token), userId: user.id, expiresAt }
  });
  const cookieHeader = `whyno_admin=${token}`;
  console.log("✓ Admin session active in DB");

  console.log("\n--- 3. Testing Protected Admin Endpoints ---");
  const endpoints = ["/admin", "/admin/orders", "/admin/products", "/admin/settings"];
  for (const ep of endpoints) {
    const res = await fetch(`${BASE}${ep}`, {
      headers: { Cookie: cookieHeader }
    });
    if (res.status !== 200) {
      throw new Error(`Expected 200 for ${ep}, got ${res.status}`);
    }
    const html = await res.text();
    console.log(`✓ GET ${ep} -> 200 OK (${html.length} bytes)`);
  }

  console.log("\n--- 4. Testing Image Upload Endpoint (/api/admin/uploads) ---");
  // Create a minimal 200x200 PNG buffer
  // We can use a 1x1 png expanded or generate with Canvas / PIL, or read an existing PNG or generate via python
  // Let's create a 200x200 PNG in Node using a basic valid PNG stream or buffer
  // Let's use the Python generated social.png to test upload!
  const fs = await import("node:fs/promises");
  const sampleBuf = await fs.readFile("public/brand/social.png");
  const form = new FormData();
  form.append("file", new Blob([sampleBuf], { type: "image/png" }), "test-product.png");

  const uploadRes = await fetch(`${BASE}/api/admin/uploads`, {
    method: "POST",
    headers: { Cookie: cookieHeader },
    body: form,
  });
  if (uploadRes.status !== 201) {
    const errText = await uploadRes.text();
    throw new Error(`Upload failed with status ${uploadRes.status}: ${errText}`);
  }
  const uploadData = await uploadRes.json();
  console.log("✓ Image upload succeeded:", uploadData);

  console.log("\n--- 5. Testing Order Lifecycle & Tracking Update ---");
  const order = await db.order.findFirst({
    where: { reference: { startsWith: "WH-" } },
    include: { items: true },
    orderBy: { createdAt: "desc" }
  });
  if (!order) throw new Error("No recent order found to test");
  console.log(`Testing with order: ${order.reference} (Current status: ${order.status})`);

  // Move PENDING -> PROCESSING
  const { updateOrderStatus } = await import("../src/lib/orders");
  await updateOrderStatus(order.id, "PROCESSING");
  console.log("✓ Transitioned status to PROCESSING");

  // Move PROCESSING -> SHIPPED with tracking number
  const trackingNumber = "IN_TRACK_9876543210";
  await updateOrderStatus(order.id, "SHIPPED", trackingNumber);
  console.log(`✓ Transitioned status to SHIPPED with tracking ${trackingNumber}`);

  // Verify order in database
  const updatedOrder = await db.order.findUnique({ where: { id: order.id } });
  if (updatedOrder?.status !== "SHIPPED" || updatedOrder?.trackingReference !== trackingNumber) {
    throw new Error(`Order status update failed. DB state: ${JSON.stringify(updatedOrder)}`);
  }
  console.log("✓ Database record verified: SHIPPED with tracking");

  console.log("\nALL ADMIN SMOKE TESTS PASSED CLEANLY!");
}

main()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
