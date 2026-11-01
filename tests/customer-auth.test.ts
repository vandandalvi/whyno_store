import { beforeEach, describe, expect, it } from "vitest";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { db } from "@/lib/db";
import { verifyFirebaseIdToken } from "@/lib/customer-auth";
import { placeOrder } from "@/lib/orders";
import { checkoutInput } from "@/lib/validation";
import { customer, key, makeProduct, resetDb, shipping } from "./helpers";

const PROJECT = "whyno-2026";

async function setup() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  const keys = createLocalJWKSet({ keys: [jwk] });
  const sign = (claims: Record<string, unknown>, o: { iss?: string; aud?: string; exp?: string; key?: CryptoKey } = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(o.iss ?? `https://securetoken.google.com/${PROJECT}`)
      .setAudience(o.aud ?? PROJECT)
      .setSubject("uid-123")
      .setIssuedAt()
      .setExpirationTime(o.exp ?? "1h")
      .sign(o.key ?? privateKey);
  return { keys, sign };
}

beforeEach(resetDb);

describe("Firebase ID token verification", () => {
  it("accepts a correctly signed token from the whyno-2026 project", async () => {
    const { keys, sign } = await setup();
    const id = await verifyFirebaseIdToken(await sign({ email: "Shopper@Example.com", email_verified: true, name: "Shop Per", picture: "https://lh3.googleusercontent.com/a" }), keys);
    expect(id).toEqual({ uid: "uid-123", email: "shopper@example.com", name: "Shop Per", photoUrl: "https://lh3.googleusercontent.com/a" });
  });

  it("rejects tokens for another project, issuer, expired, unverified or forged", async () => {
    const { keys, sign } = await setup();
    const claims = { email: "a@b.co", email_verified: true };
    expect(await verifyFirebaseIdToken(await sign(claims, { aud: "other-project" }), keys)).toBeNull();
    expect(await verifyFirebaseIdToken(await sign(claims, { iss: "https://evil.example" }), keys)).toBeNull();
    expect(await verifyFirebaseIdToken(await sign(claims, { exp: "-1m" }), keys)).toBeNull();
    expect(await verifyFirebaseIdToken(await sign({ email: "a@b.co", email_verified: false }), keys)).toBeNull();
    expect(await verifyFirebaseIdToken(await sign({ email_verified: true }), keys)).toBeNull();
    const other = await generateKeyPair("RS256");
    expect(await verifyFirebaseIdToken(await sign(claims, { key: other.privateKey }), keys)).toBeNull();
    expect(await verifyFirebaseIdToken("not.a.jwt", keys)).toBeNull();
  });
});

describe("orders and signed-in customers", () => {
  it("links an order to the signed-in customer, and leaves guest orders unlinked", async () => {
    const c = await db.customer.create({ data: { firebaseUid: "uid-1", email: "me@example.com" } });
    const p = await makeProduct({ stock: 5 });
    const item = [{ productId: p.id, quantity: 1 }];
    const mine = await placeOrder(checkoutInput.parse({ idempotencyKey: key(), customer, shipping, items: item }), c.id);
    const guest = await placeOrder(checkoutInput.parse({ idempotencyKey: key(), customer, shipping, items: item }));
    expect((await db.order.findUniqueOrThrow({ where: { reference: mine.reference } })).customerId).toBe(c.id);
    expect((await db.order.findUniqueOrThrow({ where: { reference: guest.reference } })).customerId).toBeNull();
  });
});
