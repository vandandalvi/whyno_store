import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ALLOWED_TRANSITIONS } from "@/lib/orders";
import { OrderBadge, ORDER_LABEL, PaymentBadge } from "@/components/StatusBadges";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";

export const metadata: Metadata = { title: "Order" };

const STEPS = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!o) notFound();
  const idx = STEPS.indexOf(o.status as (typeof STEPS)[number]);
  const options = [o.status, ...ALLOWED_TRANSITIONS[o.status]];

  return (
    <div className="space-y-8">
      <Link href="/admin/orders" className="text-sm underline underline-offset-4">← All orders</Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">{o.reference}</h1><p className="text-mute">Placed {o.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div>
        <div className="flex gap-2"><PaymentBadge status={o.paymentStatus} /><OrderBadge status={o.status} /></div>
      </div>

      {o.status === "CANCELLED" ? (
        <p className="rounded-xl bg-red-50 px-5 py-4 font-medium text-red-900">This order was cancelled and the items were returned to stock.</p>
      ) : (
        <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s} className={`rounded-xl px-3 py-3 text-center text-sm font-medium ${i <= idx ? "bg-lime text-lime-ink" : "bg-sand text-mute"}`} aria-current={i === idx ? "step" : undefined}>{ORDER_LABEL(s)}</li>
          ))}
        </ol>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <section className="card p-6" aria-labelledby="items">
            <h2 id="items" className="text-xl font-semibold">Items</h2>
            <ul className="mt-3 divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-3"><span>{i.nameSnapshot} <span className="text-mute">× {i.quantity}{i.skuSnapshot ? ` · ${i.skuSnapshot}` : ""}</span></span><span className="tabular-nums">{formatMoney(i.linePaise, o.currency)}</span></li>
              ))}
            </ul>
            <dl className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd>{formatMoney(o.subtotalPaise, o.currency)}</dd></div>
              <div className="flex justify-between"><dt className="text-mute">Shipping</dt><dd>{formatMoney(o.shippingPaise, o.currency)}</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatMoney(o.totalPaise, o.currency)}</dd></div>
            </dl>
            <p className="mt-4 rounded-xl border border-dashed border-lime-deep bg-lime/30 px-4 py-3 text-sm"><strong>Demo payment.</strong> This order was placed with the store’s demo checkout. No real money was received.</p>
          </section>
          <section className="card p-6" aria-labelledby="ship">
            <h2 id="ship" className="text-xl font-semibold">Deliver to</h2>
            <p className="mt-3 leading-relaxed">{o.customerName}<br />{o.shipLine1}{o.shipLine2 && <>, {o.shipLine2}</>}<br />{o.shipCity}, {o.shipState} {o.shipPostalCode}</p>
            <p className="mt-3 text-sm text-mute">{o.customerPhone} · {o.customerEmail}</p>
            {o.deliveryNotes && <p className="mt-3 rounded-xl bg-sand px-4 py-3 text-sm"><strong>Note from customer:</strong> {o.deliveryNotes}</p>}
          </section>
        </div>
        <aside className="card h-fit p-6">
          <h2 className="text-xl font-semibold">Update this order</h2>
          <OrderStatusForm id={o.id} status={o.status} tracking={o.trackingReference} options={options.map((s) => ({ value: s, label: ORDER_LABEL(s) }))} />
        </aside>
      </div>
    </div>
  );
}
