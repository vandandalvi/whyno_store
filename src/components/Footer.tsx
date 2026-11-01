import Link from "next/link";
import type { StoreSettings } from "@/lib/settings";
import { Wordmark } from "./Header";

export function Footer({ s }: { s: StoreSettings }) {
  const link = "tap text-white/60 transition hover:text-white";
  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Wordmark name={s.storeName} dark />
          <p className="mt-4 max-w-sm text-sm text-white/60">{s.tagline}</p>
        </div>
        <nav aria-label="Shop" className="text-sm">
          <h2 className="mb-2 font-sans text-sm font-semibold">Shop</h2>
          <ul>
            <li><Link className={link} href="/products">All products</Link></li>
            <li><Link className={link} href="/cart">Cart</Link></li>
            <li><Link className={link} href="/account">My account</Link></li>
          </ul>
        </nav>
        <nav aria-label="Help" className="text-sm">
          <h2 className="mb-2 font-sans text-sm font-semibold">Help</h2>
          <ul>
            <li><Link className={link} href="/policies/shipping">Shipping</Link></li>
            <li><Link className={link} href="/policies/returns">Returns</Link></li>
            <li><Link className={link} href="/policies/privacy">Privacy</Link></li>
            {s.contactEmail && <li><a className={link} href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></li>}
            {s.contactPhone && <li className="tap text-white/60">{s.contactPhone}</li>}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} {s.legalBusinessName || s.storeName}. Checkout currently uses a demo payment — no real payments are taken.
      </div>
    </footer>
  );
}
