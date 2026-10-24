import Link from "next/link";
import { CartLink } from "./CartLink";

export function Wordmark({ name }: { name: string }) {
  const short = name.replace(/\s*store\s*$/i, "") || name;
  return (
    <span className="flex items-baseline gap-0.5 font-display text-2xl font-bold tracking-tight">
      {short.toLowerCase()}
      <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-lime ring-1 ring-ink/10" />
      <span className="sr-only">{name}</span>
    </span>
  );
}

export function Header({ storeName }: { storeName: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={`${storeName} home`}>
          <Wordmark name={storeName} />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-3">
          <Link href="/products" className="rounded-full px-4 py-2.5 text-[15px] font-medium text-ink hover:bg-sand">Shop</Link>
          <form action="/products" className="hidden md:block" role="search">
            <label htmlFor="nav-search" className="sr-only">Search products</label>
            <input id="nav-search" name="q" type="search" placeholder="Search" className="h-10 w-44 rounded-full border border-line bg-white px-4 text-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-lime" />
          </form>
          <CartLink />
        </nav>
      </div>
    </header>
  );
}
