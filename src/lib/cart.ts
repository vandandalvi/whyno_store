import { db } from "./db";
import { getSettings, shippingFor } from "./settings";

export type QuoteLine = {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  unitPricePaise: number;
  stock: number;
  quantity: number; // clamped to what can actually be bought
  available: boolean;
  linePaise: number;
};
export type Quote = { lines: QuoteLine[]; subtotalPaise: number; shippingPaise: number; totalPaise: number; currency: string; freeShippingOverPaise: number };

/** Authoritative prices and availability for a cart. The browser only supplies ids and quantities. */
export async function quoteCart(items: { productId: string; quantity: number }[]): Promise<Quote> {
  const settings = await getSettings();
  const ids = [...new Set(items.map((i) => i.productId))].slice(0, 30);
  const products = await db.product.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: QuoteLine[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (!p) continue;
    const wanted = items.filter((i) => i.productId === id).reduce((n, i) => n + i.quantity, 0);
    const quantity = Math.max(0, Math.min(wanted, p.stock, 20));
    lines.push({
      productId: id,
      slug: p.slug,
      name: p.name,
      image: p.images[0]?.url ?? null,
      unitPricePaise: p.pricePaise,
      stock: p.stock,
      quantity,
      available: p.stock > 0,
      linePaise: quantity * p.pricePaise,
    });
  }
  const subtotalPaise = lines.reduce((n, l) => n + l.linePaise, 0);
  const shippingPaise = subtotalPaise > 0 ? shippingFor(subtotalPaise, settings) : 0;
  return {
    lines,
    subtotalPaise,
    shippingPaise,
    totalPaise: subtotalPaise + shippingPaise,
    currency: settings.currency,
    freeShippingOverPaise: settings.freeShippingOverPaise,
  };
}
