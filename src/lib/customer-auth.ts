import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { db } from "./db";

/**
 * Shoppers sign in with the same Whyno Google account (Firebase project `whyno-2026`) used by the
 * keyboard app and browser extension. The browser sends us Firebase's signed ID token; we verify
 * its signature, issuer and audience against Google's public keys (no secrets needed) and then
 * issue our own httpOnly session cookie.
 */
export const CUSTOMER_COOKIE = "whyno_customer";
const SESSION_DAYS = 30;
const projectId = () => process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "whyno-2026";

const JWKS_URL = new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
let remote: JWTVerifyGetKey | null = null;

export type FirebaseIdentity = { uid: string; email: string; name: string; photoUrl: string };

export async function verifyFirebaseIdToken(idToken: string, keys?: JWTVerifyGetKey): Promise<FirebaseIdentity | null> {
  try {
    remote ??= createRemoteJWKSet(JWKS_URL);
    const { payload } = await jwtVerify(idToken, keys ?? remote, {
      algorithms: ["RS256"],
      issuer: `https://securetoken.google.com/${projectId()}`,
      audience: projectId(),
    });
    const uid = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    if (!uid || uid.length > 128 || !email || payload.email_verified === false) return null;
    return {
      uid,
      email,
      name: typeof payload.name === "string" ? payload.name.slice(0, 100) : email.split("@")[0],
      photoUrl: typeof payload.picture === "string" && payload.picture.startsWith("https://") ? payload.picture.slice(0, 500) : "",
    };
  } catch {
    return null;
  }
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function startCustomerSession(id: FirebaseIdentity) {
  const customer = await db.customer.upsert({
    where: { firebaseUid: id.uid },
    create: { firebaseUid: id.uid, email: id.email, name: id.name, photoUrl: id.photoUrl },
    update: { email: id.email, name: id.name, photoUrl: id.photoUrl, lastLoginAt: new Date() },
  });
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.customerSession.create({ data: { tokenHash: sha256(token), customerId: customer.id, expiresAt } });
  (await cookies()).set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return customer;
}

export async function getCustomer() {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  const s = await db.customerSession.findUnique({ where: { tokenHash: sha256(token) }, include: { customer: true } });
  if (!s || s.expiresAt < new Date()) return null;
  return s.customer;
}

export async function endCustomerSession() {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_COOKIE)?.value;
  if (token) await db.customerSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(CUSTOMER_COOKIE);
}
