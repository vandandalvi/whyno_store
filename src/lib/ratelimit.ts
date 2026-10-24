import { headers } from "next/headers";
import { db } from "./db";

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim().split(":")[0] || "unknown";
}

/** DB-backed sliding window so limits hold across instances. Returns true when allowed. */
export async function allow(bucket: string, limit: number, windowMs: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const count = await db.rateLimitHit.count({ where: { bucket, createdAt: { gte: since } } });
  if (count >= limit) return false;
  await db.rateLimitHit.create({ data: { bucket } });
  return true;
}

export async function pruneOldRateData() {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
  await db.rateLimitHit.deleteMany({ where: { createdAt: { lt: cutoff } } });
  await db.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
  await db.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
