import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AddToCart } from "@/components/AddToCart";
import { Gallery } from "@/components/Gallery";
import { Price } from "@/components/ProductCard";
import { getPublicProduct, parseSpecs } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { appUrl } from "@/lib/env";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicProduct(slug);
  if (!p) return { title: "Product not found" };
  const title = p.seoTitle || p.name;
  const description = p.seoDescription || p.shortDescription || p.description.slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title, description, type: "website", url: `${appUrl()}/products/${p.slug}`, images: p.images[0] ? [{ url: p.images[0].url }] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [p, s] = await Promise.all([getPublicProduct(slug), getSettings()]);
  if (!p) notFound();
  const specs = parseSpecs(p.specifications);
  const sold = p.stock <= 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.shortDescription || p.description.slice(0, 300),
    sku: p.sku ?? undefined,
    image: p.images.map((i) => i.url),
    offers: {
      "@type": "Offer",
      priceCurrency: s.currency,
      price: (p.pricePaise / 100).toFixed(2),
      availability: sold ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: `${appUrl()}/products/${p.slug}`,
    },
  };

  return (
    <div className="container-x py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-x-1 text-sm text-mute">
        <Link href="/products" className="tap hover:text-ink">Shop</Link>
        {p.category && <> / <Link href={`/products?category=${p.category.slug}`} className="tap hover:text-ink">{p.category.name}</Link></>}
      </nav>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <Gallery images={p.images.map((i) => ({ url: i.url, alt: i.alt || p.name }))} name={p.name} />
        <div className="lg:pt-4">
          {p.category && <p className="text-xs font-medium uppercase tracking-wider text-mute">{p.category.name}</p>}
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{p.name}</h1>
          <Price price={p.pricePaise} compareAt={p.compareAtPaise} className="mt-4 text-2xl" />
          <p className="mt-1 text-sm text-mute">Inclusive of taxes where applicable. Shipping calculated at checkout.</p>
          {p.shortDescription && <p className="mt-6 text-lg text-mute">{p.shortDescription}</p>}

          <p className={`mt-6 text-sm font-medium ${sold ? "text-red-700" : p.stock <= s.lowStockThreshold ? "text-amber-700" : "text-green-800"}`}>
            {sold ? "Currently sold out" : p.stock <= s.lowStockThreshold ? `Only ${p.stock} left in stock` : "In stock"}
          </p>
          <div className="mt-4">
            <AddToCart productId={p.id} stock={p.stock} />
          </div>

          {p.description && (
            <section className="mt-12" aria-labelledby="desc">
              <h2 id="desc" className="text-xl font-semibold">About this product</h2>
              <div className="mt-3 space-y-3 whitespace-pre-line text-mute">{p.description}</div>
            </section>
          )}
          {specs.length > 0 && (
            <section className="mt-10" aria-labelledby="specs">
              <h2 id="specs" className="text-xl font-semibold">Details</h2>
              <dl className="mt-3 divide-y divide-line rounded-xl2 border border-line bg-white">
                {specs.map((r, i) => (
                  <div key={i} className="grid grid-cols-3 gap-4 px-5 py-3 text-sm">
                    <dt className="font-medium">{r.key}</dt>
                    <dd className="col-span-2 text-mute">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <section className="mt-10 space-y-4 text-sm text-mute">
            <div><h2 className="font-sans text-base font-semibold text-ink">Shipping</h2><p className="mt-1">{p.shippingNote || s.shippingInfo}</p></div>
            <div><h2 className="font-sans text-base font-semibold text-ink">Returns</h2><p className="mt-1">{s.returnPolicy}</p></div>
          </section>
        </div>
      </div>
    </div>
  );
}
