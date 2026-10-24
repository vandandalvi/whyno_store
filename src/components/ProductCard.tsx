import Image from "next/image";
import Link from "next/link";
import { discountPercent, formatMoney } from "@/lib/money";

type Card = {
  slug: string;
  name: string;
  pricePaise: number;
  compareAtPaise: number | null;
  stock: number;
  images: { url: string; alt: string }[];
  category?: { name: string } | null;
};

export function ProductImage({ src, alt, sizes, priority }: { src?: string; alt: string; sizes: string; priority?: boolean }) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sand to-line text-sm text-mute" role="img" aria-label={alt}>
        No photo yet
      </div>
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />;
}

export function Price({ price, compareAt, className = "" }: { price: number; compareAt?: number | null; className?: string }) {
  const off = discountPercent(price, compareAt);
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className="font-semibold">{formatMoney(price)}</span>
      {off && (
        <>
          <s className="text-sm text-mute"><span className="sr-only">Original price </span>{formatMoney(compareAt!)}</s>
          <span className="badge bg-lime text-lime-ink">{off}% off</span>
        </>
      )}
    </p>
  );
}

export function ProductCard({ p, lowStock = 5 }: { p: Card; lowStock?: number }) {
  const sold = p.stock <= 0;
  return (
    <Link href={`/products/${p.slug}`} className="group block">
      <div className="card relative aspect-[4/5] overflow-hidden transition duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-lift">
        <div className="absolute inset-0 transition duration-500 ease-out group-hover:scale-[1.03]">
          <ProductImage src={p.images[0]?.url} alt={p.images[0]?.alt || p.name} sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw" />
        </div>
        {sold && <span className="badge absolute left-3 top-3 bg-ink text-white">Sold out</span>}
        {!sold && p.stock <= lowStock && <span className="badge absolute left-3 top-3 bg-white text-ink shadow-card">Only {p.stock} left</span>}
      </div>
      <div className="px-1 pt-4">
        {p.category && <p className="text-xs font-medium uppercase tracking-wider text-mute">{p.category.name}</p>}
        <h3 className="mt-1 font-sans text-[17px] font-medium leading-snug">{p.name}</h3>
        <Price price={p.pricePaise} compareAt={p.compareAtPaise} className="mt-1 text-[15px]" />
      </div>
    </Link>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <div aria-hidden className="mb-6 h-16 w-16 rounded-full bg-lime/70" />
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-mute">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
