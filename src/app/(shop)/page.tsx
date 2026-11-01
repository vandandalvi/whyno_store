import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PackageCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { EmptyState, ProductCard } from "@/components/ProductCard";
import { listCategories, listPublicProducts } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";

export const revalidate = 60;

export default async function Home() {
  const [s, { items }, categories] = await Promise.all([getSettings(), listPublicProducts({ take: 8 }), listCategories()]);
  const perks = [
    { Icon: Truck, title: s.freeShippingOverPaise > 0 ? `Free shipping over ${formatMoney(s.freeShippingOverPaise)}` : "Delivered to your door", body: "Packed by hand and sent quickly." },
    { Icon: RotateCcw, title: "Easy returns", body: "Something not right? We’ll make it right." },
    { Icon: ShieldCheck, title: "Safe checkout", body: "We never ask for card details." },
    { Icon: PackageCheck, title: "Made with care", body: "Chosen one product at a time." },
  ];

  return (
    <>
      <section className="container-x pt-4 sm:pt-6">
        <div className="relative isolate overflow-hidden rounded-xl3 bg-ink text-white">
          <div aria-hidden className="absolute -right-32 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full bg-lime/30 blur-3xl" />
          <div aria-hidden className="absolute -bottom-48 -left-24 -z-10 h-[26rem] w-[26rem] rounded-full bg-lime/10 blur-3xl" />
          <div className="grid items-center gap-8 px-6 py-14 sm:px-12 sm:py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-16 lg:py-24">
            <div className="text-center lg:text-left">
              <p className="rise inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[.18em] text-lime">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" aria-hidden />{s.storeName}
              </p>
              <h1 className="rise mt-6 text-4xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl" style={{ animationDelay: ".08s" }}>{s.heroHeadline}</h1>
              <p className="rise mx-auto mt-5 max-w-xl text-base text-white/70 sm:text-xl lg:mx-0" style={{ animationDelay: ".16s" }}>{s.heroSubtext}</p>
              <div className="rise mt-9 flex flex-wrap justify-center gap-3 lg:justify-start" style={{ animationDelay: ".24s" }}>
                <Link href="/products" className="btn-lime px-8 text-base">Shop the collection <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                <Link href="/account" className="btn border border-white/25 px-7 text-white hover:bg-white/10">Sign in</Link>
              </div>
            </div>
            <div className="rise order-first mx-auto w-48 sm:w-64 lg:order-none lg:w-full lg:max-w-sm" style={{ animationDelay: ".12s" }}>
              <Image src="/brand/logo.png" alt="Whyno" width={480} height={286} priority unoptimized className="h-auto w-full drop-shadow-[0_20px_50px_rgba(227,239,118,.25)]" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-x mt-6" aria-label="Why shop with us">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {perks.map(({ Icon, title, body }) => (
            <li key={title} className="flex flex-col gap-2 rounded-xl2 bg-white p-4 shadow-card sm:flex-row sm:items-start sm:gap-4 sm:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime"><Icon className="h-5 w-5" aria-hidden /></span>
              <span><span className="block text-sm font-semibold leading-snug">{title}</span><span className="mt-0.5 block text-xs text-mute sm:text-sm">{body}</span></span>
            </li>
          ))}
        </ul>
      </section>

      {categories.length > 0 && (
        <section className="container-x mt-16" aria-labelledby="cats">
          <h2 id="cats" className="mb-5 text-2xl font-bold sm:text-3xl">Shop by category</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/products?category=${c.slug}`} className="group flex min-h-[96px] items-end justify-between rounded-xl2 bg-sand p-5 transition duration-300 hover:-translate-y-0.5 hover:bg-lime hover:shadow-lift">
                  <span className="font-display text-lg font-semibold">{c.name}</span>
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-x mt-16" aria-labelledby="new-heading">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-mute">Just in</p>
            <h2 id="new-heading" className="mt-1 text-3xl font-bold sm:text-4xl">New arrivals</h2>
          </div>
          {items.length > 0 && <Link href="/products" className="tap shrink-0 text-sm font-medium underline-offset-4 hover:underline">View all →</Link>}
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

      <section className="container-x mt-24">
        <div className="relative overflow-hidden rounded-xl3 bg-lime px-8 py-14 text-center sm:px-14 sm:py-20">
          <div aria-hidden className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/40 blur-2xl" />
          <h2 className="relative mx-auto max-w-2xl text-3xl font-bold text-lime-ink sm:text-5xl">{s.tagline}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-lime-ink/80">Every order is packed by hand and sent with a simple promise: if something isn’t right, we’ll make it right.</p>
          <Link href="/products" className="btn-primary relative mt-8 px-8">Start shopping</Link>
        </div>
      </section>
    </>
  );
}
