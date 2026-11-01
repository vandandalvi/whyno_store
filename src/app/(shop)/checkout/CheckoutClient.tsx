"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useQuote } from "@/components/useQuote";
import { EmptyState } from "@/components/ProductCard";
import { formatMoney } from "@/lib/money";

const IDEM = "whyno.checkout.key";
function idemKey() {
  try {
    const k = sessionStorage.getItem(IDEM);
    if (k) return k;
    const n = crypto.randomUUID();
    sessionStorage.setItem(IDEM, n);
    return n;
  } catch {
    return crypto.randomUUID();
  }
}

type F = Record<string, string>;
const empty: F = { name: "", email: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", notes: "" };

function Field({ id, label, errors, ...rest }: { id: string; label: string; errors: F } & React.InputHTMLAttributes<HTMLInputElement>) {
  const err = errors[id];
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} name={id} className="input" aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined} {...rest} />
      {err && <p id={`${id}-err`} className="field-error">{err}</p>}
    </div>
  );
}

export default function CheckoutClient({ prefill }: { prefill?: { name: string; email: string } }) {
  const router = useRouter();
  const { lines, clear } = useCart();
  const { quote, loading, empty: cartEmpty, error } = useQuote();
  const [f, setF] = useState<F>({ ...empty, name: prefill?.name ?? "", email: prefill?.email ?? "" });
  const [errors, setErrors] = useState<F>({});
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  if (cartEmpty) return <EmptyState title="Your cart is empty" body="Add something before checking out." action={<Link href="/products" className="btn-primary">Shop now</Link>} />;
  if (error) return <EmptyState title="We couldn’t load your order" body="Please refresh the page." />;
  if (loading || !quote) return <div className="container-x py-24 text-center text-mute" aria-busy="true">Loading…</div>;

  const c = quote.currency;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const blocked = quote.lines.some((l) => l.quantity === 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setBanner(null);
    setErrors({});
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: idemKey(),
          customer: { name: f.name, email: f.email, phone: f.phone },
          shipping: { line1: f.line1, line2: f.line2, city: f.city, state: f.state, postalCode: f.postalCode, country: "IN", notes: f.notes },
          items: lines,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        try { sessionStorage.removeItem(IDEM); } catch { /* ignore */ }
        clear();
        router.push(`/order/${data.reference}${data.token ? `?t=${encodeURIComponent(data.token)}` : ""}`);
        return;
      }
      if (res.status === 422 && data.fields) {
        const mapped: F = {};
        for (const [k, v] of Object.entries<string>(data.fields)) mapped[k.split(".").pop()!] = v;
        setErrors(mapped);
        setBanner("Please check the highlighted details.");
        document.getElementById(Object.keys(mapped)[0])?.focus();
      } else {
        setBanner(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setBanner("We couldn’t reach the store. Please check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="container-x py-12">
      <h1 className="text-4xl font-bold">Checkout</h1>
      <form onSubmit={submit} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-10">
          {banner && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{banner}</div>}
          <fieldset className="space-y-4">
            <legend className="mb-2 text-xl font-semibold">Contact</legend>
            <Field id="name" label="Full name" autoComplete="name" required value={f.name} onChange={set("name")} errors={errors} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="email" label="Email" type="email" autoComplete="email" required value={f.email} onChange={set("email")} errors={errors} />
              <Field id="phone" label="Phone" type="tel" autoComplete="tel" required value={f.phone} onChange={set("phone")} errors={errors} />
            </div>
          </fieldset>
          <fieldset className="space-y-4">
            <legend className="mb-2 text-xl font-semibold">Delivery address</legend>
            <Field id="line1" label="Address" autoComplete="address-line1" required value={f.line1} onChange={set("line1")} errors={errors} />
            <Field id="line2" label="Apartment, landmark (optional)" autoComplete="address-line2" value={f.line2} onChange={set("line2")} errors={errors} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="city" label="City" autoComplete="address-level2" required value={f.city} onChange={set("city")} errors={errors} />
              <Field id="state" label="State" autoComplete="address-level1" required value={f.state} onChange={set("state")} errors={errors} />
              <Field id="postalCode" label="PIN code" inputMode="numeric" autoComplete="postal-code" required value={f.postalCode} onChange={set("postalCode")} errors={errors} />
            </div>
            <div>
              <label htmlFor="notes" className="label">Delivery instructions (optional)</label>
              <textarea id="notes" rows={2} maxLength={300} className="input" value={f.notes} onChange={set("notes")} />
            </div>
          </fieldset>
          <section aria-labelledby="pay" className="rounded-xl2 border-2 border-dashed border-lime-deep bg-lime/30 p-5">
            <h2 id="pay" className="text-xl font-semibold">Demo payment</h2>
            <p className="mt-2 text-sm">This store is in demo mode. <strong>No real payment is taken</strong> and no card details are needed. Your order will be recorded as a demo order.</p>
          </section>
        </div>

        <aside className="card h-fit p-6 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 className="text-xl font-semibold">Order summary</h2>
          <ul className="mt-4 divide-y divide-line text-sm">
            {quote.lines.map((l) => (
              <li key={l.productId} className="flex justify-between gap-3 py-3">
                <span>{l.name} <span className="text-mute">× {l.quantity}</span></span>
                <span className="tabular-nums">{formatMoney(l.linePaise, c)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-2 text-[15px]">
            <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="tabular-nums">{formatMoney(quote.subtotalPaise, c)}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Shipping</dt><dd className="tabular-nums">{quote.shippingPaise === 0 ? "Free" : formatMoney(quote.shippingPaise, c)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(quote.totalPaise, c)}</dd></div>
          </dl>
          {blocked && <p role="alert" className="mt-4 text-sm font-medium text-red-700">Some items are sold out. <Link href="/cart" className="underline">Update your cart</Link>.</p>}
          <button type="submit" className="btn-primary mt-6 w-full" disabled={busy || blocked}>{busy ? "Placing order…" : "Place demo order"}</button>
        </aside>
      </form>
    </div>
  );
}
