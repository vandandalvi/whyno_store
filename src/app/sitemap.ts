import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const products = await db.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } });
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    ...["shipping", "returns", "privacy"].map((p) => ({ url: `${base}/policies/${p}`, changeFrequency: "yearly" as const, priority: 0.2 })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
