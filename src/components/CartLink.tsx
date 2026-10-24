"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";

export function CartLink() {
  const { count, ready } = useCart();
  return (
    <Link href="/cart" className="relative flex h-11 w-11 items-center justify-center rounded-full hover:bg-sand" aria-label={`Cart${ready ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`}>
      <ShoppingBag className="h-5 w-5" aria-hidden />
      {ready && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1 text-[11px] font-bold text-ink ring-2 ring-paper">{count}</span>
      )}
    </Link>
  );
}
