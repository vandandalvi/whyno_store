"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = { productId: string; quantity: number };
type Ctx = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (productId: string, quantity: number, max?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  toast: string | null;
};

const KEY = "whyno.cart.v1";
const CartContext = createContext<Ctx | null>(null);

function load(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((l) => typeof l?.productId === "string" && Number.isInteger(l?.quantity) && l.quantity > 0).slice(0, 30)
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLines(load());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && setLines(load());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode: cart lives in memory only */
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const value = useMemo<Ctx>(
    () => ({
      lines,
      ready,
      toast,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      add: (productId, quantity, max = 20) => {
        const existing = lines.find((l) => l.productId === productId);
        const qty = Math.min(max, 20, (existing?.quantity ?? 0) + quantity);
        persist(existing ? lines.map((l) => (l.productId === productId ? { ...l, quantity: qty } : l)) : [...lines, { productId, quantity: qty }]);
        setToast(qty < (existing?.quantity ?? 0) + quantity ? "Added the most we have in stock" : "Added to your cart");
      },
      setQuantity: (productId, quantity) =>
        persist(quantity <= 0 ? lines.filter((l) => l.productId !== productId) : lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(20, quantity) } : l))),
      remove: (productId) => persist(lines.filter((l) => l.productId !== productId)),
      clear: () => persist([]),
    }),
    [lines, ready, toast, persist],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {toast && <div className="rise rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-lift">{toast}</div>}
      </div>
    </CartContext.Provider>
  );
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
