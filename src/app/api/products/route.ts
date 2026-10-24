import { json } from "@/lib/http";
import { listPublicProducts, type Sort } from "@/lib/products";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const sort = u.searchParams.get("sort");
  const r = await listPublicProducts({
    q: u.searchParams.get("q")?.slice(0, 80) || undefined,
    category: u.searchParams.get("category") || undefined,
    sort: (["newest", "price-asc", "price-desc"].includes(sort ?? "") ? sort : "newest") as Sort,
    page: Number(u.searchParams.get("page")) || 1,
  });
  return json({
    page: r.page,
    pages: r.pages,
    total: r.total,
    items: r.items.map((p) => ({ id: p.id, slug: p.slug, name: p.name, pricePaise: p.pricePaise, compareAtPaise: p.compareAtPaise, inStock: p.stock > 0, image: p.images[0]?.url ?? null, category: p.category?.slug ?? null })),
  });
}
