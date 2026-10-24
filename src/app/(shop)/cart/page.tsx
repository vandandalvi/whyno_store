"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { useQuote } from "@/components/useQuote";
import { EmptyState } from "@/components/ProductCard";
import { formatMoney } from "@/lib/money";

export default function CartPage() {
  const { setQuantity, remove } = useCart();
  const { quote, error, loading, empty } = useQuote();

  if (empty) {
    return <EmptyState title="Your cart is empty" body="Find something you love and it will show up here." action={<Link href="/products" className="btn-primary">Start shopping</Link>} />;
  }
  if (error) return <EmptyState title="We couldn’t load your cart" body="Please check your connection and refresh the page." />;
  if (loading || !quote) return <div className="container-x py-24 text-center text-mute" aria-busy="true">Loading your cart…</div>;

  const c = quote.currency;
  const blocked = quote.lines.some((l) => l.quantity === 0);
  return (
    <div className="container-x py-12">
      <h1 className="text-4xl font-bold">Your cart</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-line">
          {quote.lines.map((l) => (
            <li key={l.productId} className="flex gap-4 py-6">
              <Link href={`/products/${l.slug}`} className="card relative h-28 w-24 shrink-0 overflow-hidden sm:h-32 sm:w-28">
                {l.image ? <Image src={l.image} alt={l.name} fill sizes="112px" className="object-cover" /> : <div className="h-full bg-sand" />}
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex justify-between gap-3">
                  <div>
                    <Link href={`/products/${l.slug}`} className="font-medium hover:underline">{l.name}</Link>
                    <p className="text-sm text-mute">{formatMoney(l.unitPricePaise, c)} each</p>
                    {l.quantity === 0 && <p className="mt-1 text-sm font-medium text-red-700">Sold out — remove to continue</p>}
                  </div>
                  <p className="font-semibold tabular-nums">{formatMoney(l.linePaise, c)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-line bg-white" role="group" aria-label={`Quantity for ${l.name}`}>
                    <button className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-sand" aria-label="Decrease quantity" onClick={() => setQuantity(l.productId, l.quantity - 1)}><Minus className="h-4 w-4" /></button>
                    <span className="w-8 text-center tabular-nums">{l.quantity}</span>
                    <button className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-sand disabled:opacity-40" aria-label="Increase quantity" disabled={l.quantity >= Math.min(l.stock, 20)} onClick={() => setQuantity(l.productId, l.quantity + 1)}><Plus className="h-4 w-4" /></button>
                  </div>
                  <button className="flex h-11 items-center gap-1.5 rounded-full px-3 text-sm text-mute hover:text-red-700" onClick={() => remove(l.productId)}><Trash2 className="h-4 w-4" aria-hidden />Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="card h-fit p-6 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 className="text-xl font-semibold">Summary</h2>
          <dl className="mt-5 space-y-3 text-[15px]">
            <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="tabular-nums">{formatMoney(quote.subtotalPaise, c)}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Shipping</dt><dd className="tabular-nums">{quote.shippingPaise === 0 ? "Free" : formatMoney(quote.shippingPaise, c)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(quote.totalPaise, c)}</dd></div>
          </dl>
          {quote.freeShippingOverPaise > 0 && quote.shippingPaise > 0 && (
            <p className="mt-3 text-sm text-mute">Add {formatMoney(quote.freeShippingOverPaise - quote.subtotalPaise, c)} more for free shipping.</p>
          )}
          {blocked ? (
            <button className="btn-primary mt-6 w-full" disabled>Remove sold-out items</button>
          ) : (
            <Link href="/checkout" className="btn-primary mt-6 w-full">Checkout</Link>
          )}
        </aside>
      </div>
    </div>
  );
}
