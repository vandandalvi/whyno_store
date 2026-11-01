import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, ProductCard } from "@/components/ProductCard";
import { listCategories, listPublicProducts, type Sort } from "@/lib/products";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Shop", alternates: { canonical: "/products" } };

type SP = { q?: string; category?: string; sort?: string; page?: string };
const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const sort = SORTS.some((s) => s.value === sp.sort) ? (sp.sort as Sort) : "newest";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const [settings, categories, result] = await Promise.all([
    getSettings(),
    listCategories(),
    listPublicProducts({ q, category: sp.category, sort, page }),
  ]);

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q, category: sp.category, sort: sort === "newest" ? undefined : sort, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/products?${s}` : "/products";
  };

  return (
    <div className="container-x py-12">
      <h1 className="text-4xl font-bold sm:text-5xl">Shop</h1>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <ul className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>li]:shrink-0" aria-label="Categories">
          <li><Link href={qs({ category: undefined, page: undefined })} aria-current={!sp.category ? "page" : undefined} className={`btn min-h-[44px] ${!sp.category ? "bg-ink text-white" : "border border-line bg-white hover:bg-sand"}`}>All</Link></li>
          {categories.map((c) => (
            <li key={c.id}><Link href={qs({ category: c.slug, page: undefined })} aria-current={sp.category === c.slug ? "page" : undefined} className={`btn min-h-[44px] ${sp.category === c.slug ? "bg-ink text-white" : "border border-line bg-white hover:bg-sand"}`}>{c.name}</Link></li>
          ))}
        </ul>
        <form action="/products" className="flex flex-wrap gap-2" role="search">
          {sp.category && <input type="hidden" name="category" value={sp.category} />}
          <label htmlFor="q" className="sr-only">Search products</label>
          <input id="q" name="q" defaultValue={q} type="search" placeholder="Search products" className="input min-w-0 flex-1 basis-full sm:basis-56 sm:flex-none" />
          <label htmlFor="sort" className="sr-only">Sort by</label>
          <select id="sort" name="sort" defaultValue={sort} className="input min-w-0 flex-1 sm:w-auto sm:flex-none">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn-ghost">Apply</button>
        </form>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          title={q || sp.category ? "Nothing matches that" : "Our shelves are being stocked"}
          body={q || sp.category ? "Try a different search or category." : "New products are coming soon."}
          action={(q || sp.category) && <Link href="/products" className="btn-primary">Clear filters</Link>}
        />
      ) : (
        <>
          <p className="mt-8 text-sm text-mute" aria-live="polite">{result.total} product{result.total === 1 ? "" : "s"}</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {result.items.map((p) => <li key={p.id}><ProductCard p={p} lowStock={settings.lowStockThreshold} /></li>)}
          </ul>
          {result.pages > 1 && (
            <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-3">
              {page > 1 && <Link className="btn-ghost" href={qs({ page: String(page - 1) })}>Previous</Link>}
              <span className="text-sm text-mute">Page {page} of {result.pages}</span>
              {page < result.pages && <Link className="btn-ghost" href={qs({ page: String(page + 1) })}>Next</Link>}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
