import Link from "next/link";
import type { StoreSettings } from "@/lib/settings";
import { Wordmark } from "./Header";

export function Footer({ s }: { s: StoreSettings }) {
  return (
    <footer className="mt-24 border-t border-line bg-sand/60">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Wordmark name={s.storeName} />
          <p className="mt-3 max-w-sm text-sm text-mute">{s.tagline}</p>
        </div>
        <nav aria-label="Shop" className="text-sm">
          <h2 className="mb-3 font-sans text-sm font-semibold">Shop</h2>
          <ul className="space-y-2 text-mute">
            <li><Link className="hover:text-ink" href="/products">All products</Link></li>
            <li><Link className="hover:text-ink" href="/cart">Cart</Link></li>
          </ul>
        </nav>
        <nav aria-label="Help" className="text-sm">
          <h2 className="mb-3 font-sans text-sm font-semibold">Help</h2>
          <ul className="space-y-2 text-mute">
            <li><Link className="hover:text-ink" href="/policies/shipping">Shipping</Link></li>
            <li><Link className="hover:text-ink" href="/policies/returns">Returns</Link></li>
            <li><Link className="hover:text-ink" href="/policies/privacy">Privacy</Link></li>
            {s.contactEmail && <li><a className="hover:text-ink" href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></li>}
            {s.contactPhone && <li>{s.contactPhone}</li>}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-mute">
        © {new Date().getFullYear()} {s.legalBusinessName || s.storeName}. Checkout currently uses a demo payment — no real payments are taken.
      </div>
    </footer>
  );
}
