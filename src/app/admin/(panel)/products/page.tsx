import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ProductStatus } from "@prisma/client";
import { adminListProducts } from "@/lib/products";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { ProductBadge } from "@/components/StatusBadges";
import { setProductStatusAction } from "../../actions";

export const metadata: Metadata = { title: "Products" };

type SP = { q?: string; status?: string; page?: string; saved?: string; removed?: string };
const FILTERS = [
  ["", "All"], ["PUBLISHED", "Visible"], ["DRAFT", "Hidden"], ["LOW", "Running low"], ["OUT", "Sold out"], ["ARCHIVED", "Archived"],
] as const;

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const status = FILTERS.some(([v]) => v === sp.status && v) ? (sp.status as ProductStatus | "LOW" | "OUT") : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const { items, total, pages } = await adminListProducts({ q: sp.q?.trim(), status, page }, s.lowStockThreshold);
  const href = (over: Record<string, string>) => {
    const p = new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.status ? { status: sp.status } : {}), ...over });
    return `/admin/products?${p}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="btn-lime">+ Add a product</Link>
      </div>
      {sp.saved && <p role="status" className="rounded-xl bg-lime/50 px-4 py-3 font-medium">Saved. Your changes are live in the shop.</p>}
      {sp.removed && <p role="status" className="rounded-xl bg-lime/50 px-4 py-3 font-medium">Product removed.</p>}

      <form className="flex flex-wrap gap-3" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <label htmlFor="q" className="sr-only">Search products</label>
        <input id="q" name="q" defaultValue={sp.q} type="search" placeholder="Search by name or SKU" className="input max-w-sm" />
        <button className="btn-ghost">Search</button>
      </form>
      <ul className="flex flex-wrap gap-2" aria-label="Filter">
        {FILTERS.map(([v, label]) => (
          <li key={v}><Link href={href({ status: v })} aria-current={(sp.status ?? "") === v ? "page" : undefined} className={`btn min-h-[44px] ${(sp.status ?? "") === v ? "bg-ink text-white" : "border border-line bg-white hover:bg-sand"}`}>{label}</Link></li>
        ))}
      </ul>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-lg font-medium">{sp.q || status ? "No products match." : "You haven’t added any products yet."}</p>
          {!sp.q && !status && <Link href="/admin/products/new" className="btn-lime mt-6">Add your first product</Link>}
        </div>
      ) : (
        <ul className="card divide-y divide-line">
          {items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-4 p-4 sm:px-6">
              <Link href={`/admin/products/${p.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-sand">
                  {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="64px" className="object-cover" unoptimized />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block text-sm text-mute">{formatMoney(p.pricePaise)} · {p.stock <= 0 ? <b className="text-red-700">Sold out</b> : p.stock <= s.lowStockThreshold ? <b className="text-amber-700">{p.stock} left</b> : `${p.stock} in stock`}</span>
                </span>
              </Link>
              <ProductBadge status={p.status} />
              {p.status !== "ARCHIVED" && (
                <form action={setProductStatusAction.bind(null, p.id, p.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED")}>
                  <button className="btn-ghost !min-h-[44px]">{p.status === "PUBLISHED" ? "Hide" : "Show in shop"}</button>
                </form>
              )}
              <Link href={`/admin/products/${p.id}`} className="btn-primary !min-h-[44px]">Edit</Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
          {page > 1 && <Link className="btn-ghost" href={href({ page: String(page - 1) })}>Previous</Link>}
          <span className="text-sm text-mute">Page {page} of {pages} · {total} products</span>
          {page < pages && <Link className="btn-ghost" href={href({ page: String(page + 1) })}>Next</Link>}
        </nav>
      )}
    </div>
  );
}
