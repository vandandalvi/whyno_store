import Link from "next/link";
import { EmptyState, ProductCard } from "@/components/ProductCard";
import { listCategories, listPublicProducts } from "@/lib/products";
import { getSettings } from "@/lib/settings";

export const revalidate = 60;

export default async function Home() {
  const [s, { items }, categories] = await Promise.all([getSettings(), listPublicProducts({ take: 8 }), listCategories()]);
  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_70%_20%,#E3EF76_0%,rgba(227,239,118,0)_70%)] opacity-70" />
        <div className="container-x py-24 text-center sm:py-32 lg:py-40">
          <p className="rise text-sm font-medium uppercase tracking-[.2em] text-mute">{s.storeName}</p>
          <h1 className="rise mx-auto mt-5 max-w-4xl text-5xl font-bold leading-[1.05] sm:text-7xl" style={{ animationDelay: ".08s" }}>
            {s.heroHeadline}
          </h1>
          <p className="rise mx-auto mt-6 max-w-xl text-lg text-mute sm:text-xl" style={{ animationDelay: ".16s" }}>{s.heroSubtext}</p>
          <div className="rise mt-10 flex flex-wrap justify-center gap-3" style={{ animationDelay: ".24s" }}>
            <Link href="/products" className="btn-primary px-8">Shop the collection</Link>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="container-x pb-4" aria-label="Categories">
          <ul className="flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <li key={c.id}><Link href={`/products?category=${c.slug}`} className="btn-ghost min-h-[44px]">{c.name}</Link></li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-x mt-16" aria-labelledby="new-heading">
        <div className="mb-8 flex items-end justify-between">
          <h2 id="new-heading" className="text-3xl font-bold sm:text-4xl">New arrivals</h2>
          {items.length > 0 && <Link href="/products" className="text-sm font-medium underline-offset-4 hover:underline">View all</Link>}
        </div>
        {items.length === 0 ? (
          <EmptyState title="Our shelves are being stocked" body="New products are coming soon. Please check back shortly." />
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
            {items.map((p) => (
              <li key={p.id}><ProductCard p={p} lowStock={s.lowStockThreshold} /></li>
            ))}
          </ul>
        )}
      </section>

      <section className="container-x mt-28">
        <div className="mx-auto max-w-3xl rounded-xl3 bg-sand px-8 py-14 text-center sm:px-14">
          <h2 className="text-3xl font-bold">Made with care</h2>
          <p className="mt-4 text-lg text-mute">{s.tagline} Every order is packed by hand and sent with a simple promise: if something isn’t right, we’ll make it right.</p>
        </div>
      </section>
    </>
  );
}
