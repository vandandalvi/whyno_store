"use client";

import Link from "next/link";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useCart } from "./CartProvider";

export function AddToCart({ productId, stock }: { productId: string; stock: number }) {
  const { add, lines } = useCart();
  const inCart = lines.find((l) => l.productId === productId)?.quantity ?? 0;
  const max = Math.max(0, Math.min(20, stock) - inCart);
  const [qty, setQty] = useState(1);

  if (stock <= 0) return <button className="btn-primary w-full sm:w-auto" disabled>Sold out</button>;
  const q = Math.min(qty, Math.max(1, max));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-full border border-line bg-white" role="group" aria-label="Quantity">
          <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-sand disabled:opacity-40" onClick={() => setQty(Math.max(1, q - 1))} disabled={q <= 1} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
          <span className="w-8 text-center font-medium tabular-nums" aria-live="polite">{q}</span>
          <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-sand disabled:opacity-40" onClick={() => setQty(Math.min(max, q + 1))} disabled={q >= max} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
        </div>
        <button type="button" className="btn-primary flex-1 sm:flex-none sm:px-10" disabled={max <= 0} onClick={() => { add(productId, q, stock); setQty(1); }}>
          {max <= 0 ? "Maximum in cart" : "Add to cart"}
        </button>
      </div>
      {inCart > 0 && <p className="text-sm text-mute">{inCart} in your cart. <Link href="/cart" className="font-medium text-ink underline underline-offset-4">View cart</Link></p>}
    </div>
  );
}
