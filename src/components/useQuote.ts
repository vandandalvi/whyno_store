"use client";

import { useEffect, useState } from "react";
import type { Quote } from "@/lib/cart";
import { useCart } from "./CartProvider";

/** Fetches authoritative prices/stock for the current cart and drops items that no longer exist. */
export function useQuote() {
  const { lines, ready, remove } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState(false);
  const sig = lines.map((l) => `${l.productId}:${l.quantity}`).join(",");

  useEffect(() => {
    if (!ready) return;
    if (lines.length === 0) {
      setQuote(null);
      return;
    }
    const ctl = new AbortController();
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: lines }),
      signal: ctl.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("quote failed"))))
      .then((q: Quote) => {
        setError(false);
        setQuote(q);
        const known = new Set(q.lines.map((l) => l.productId));
        lines.filter((l) => !known.has(l.productId)).forEach((l) => remove(l.productId));
      })
      .catch((e) => e.name !== "AbortError" && setError(true));
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, ready]);

  return { quote, error, loading: ready && lines.length > 0 && !quote && !error, empty: ready && lines.length === 0 };
}
