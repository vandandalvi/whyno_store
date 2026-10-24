import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hash, verify } from "@node-rs/argon2";
import { db } from "./db";

export const SESSION_COOKIE = "whyno_admin";
const SESSION_HOURS = 8;
const MAX_FAILURES = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

// argon2id parameters (OWASP-recommended minimum class).
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (pw: string) => hash(pw, ARGON);
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// Verified against when the account does not exist, so timing doesn't reveal it.
let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= hashPassword(randomBytes(16).toString("hex")));

export function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 12) return "Password must be at least 12 characters.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Password must include letters and numbers.";
  return null;
}

export type LoginResult = { ok: true } | { ok: false; error: string };
const GENERIC = "That email or password isn't right. Please try again.";

export async function login(email: string, password: string, ip: string): Promise<LoginResult> {
  const keys = [`e:${email}`, `i:${ip}`];
  const since = new Date(Date.now() - LOCK_WINDOW_MS);
  for (const key of keys) {
    const fails = await db.loginAttempt.count({ where: { key, success: false, createdAt: { gte: since } } });
    if (fails >= (key.startsWith("i:") ? MAX_FAILURES * 4 : MAX_FAILURES)) {
      return { ok: false, error: "Too many attempts. Please wait 15 minutes and try again." };
    }
  }

  const user = await db.adminUser.findUnique({ where: { email } });
  const valid = await verify(user?.passwordHash ?? (await dummyHash()), password).catch(() => false);
  const success = !!user && user.active && valid;
  await db.loginAttempt.createMany({ data: keys.map((key) => ({ key, success })) });
  if (!success || !user) return { ok: false, error: GENERIC };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  await db.adminSession.create({ data: { tokenHash: sha256(token), userId: user.id, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
  return { ok: true };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.adminSession.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function getAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await db.adminSession.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!s || s.expiresAt < new Date() || !s.user.active) return null;
  return s.user;
}

/** Call at the top of every admin page, server action and API handler. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
