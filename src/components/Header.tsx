import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { AccountMenu } from "./AccountMenu";
import { CartLink } from "./CartLink";

export function Wordmark({ name, dark = false }: { name: string; dark?: boolean }) {
  const short = name.replace(/\s*store\s*$/i, "") || name;
  return (
    <span className="flex items-center gap-2.5">
      <Image src="/brand/mark.png" alt="" width={36} height={36} priority unoptimized className="h-9 w-9 rounded-[10px] shadow-sm" />
      <span className={`font-display text-[22px] font-bold leading-none tracking-tight ${dark ? "text-white" : ""}`}>
        {short.toLowerCase()}
        <span className={`ml-1 hidden text-[11px] min-[420px]:inline font-medium uppercase tracking-[.22em] ${dark ? "text-white/50" : "text-mute"}`}>store</span>
      </span>
      <span className="sr-only">{name}</span>
    </span>
  );
}

export function Header({ storeName, me }: { storeName: string; me: { name: string; email: string; photoUrl: string } | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-paper/80 backdrop-blur-xl">
      <div className="container-x flex h-16 items-center justify-between gap-3">
        <Link href="/" aria-label={`${storeName} home`} className="tap">
          <Wordmark name={storeName} />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-2">
          <Link href="/products" className="hidden rounded-full px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-sand sm:inline-block sm:px-4">Shop</Link>
          <form action="/products" className="hidden md:block" role="search">
            <label htmlFor="nav-search" className="sr-only">Search products</label>
            <input id="nav-search" name="q" type="search" placeholder="Search" className="h-10 w-40 rounded-full border border-line bg-white px-4 text-sm transition-all focus:w-56 focus:border-ink focus:outline-none focus:ring-2 focus:ring-lime" />
          </form>
          <Link href="/products#q" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-sand md:hidden" aria-label="Search products">
            <Search className="h-5 w-5" aria-hidden />
          </Link>
          <CartLink />
          <AccountMenu me={me} />
        </nav>
      </div>
    </header>
  );
}
