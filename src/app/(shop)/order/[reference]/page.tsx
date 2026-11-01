import type { Metadata } from "next";
import Link from "next/link";
import { findOrderForCustomer } from "@/lib/orders";
import { getCustomer } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  PENDING: "Received", PROCESSING: "Being prepared", SHIPPED: "On its way", DELIVERED: "Delivered", CANCELLED: "Cancelled",
};

export default async function OrderPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ t?: string }> }) {
  const { reference } = await params;
  const { t } = await searchParams;
  let order = await findOrderForCustomer(reference, t ?? "");
  if (!order) {
    const me = await getCustomer();
    if (me) order = await db.order.findFirst({ where: { reference, customerId: me.id }, include: { items: true } });
  }

  if (!order) {
    // Without the private link we show only the reference — never order details.
    return (
      <div className="container-x mx-auto max-w-xl py-24 text-center">
        <h1 className="text-4xl font-bold">Thank you</h1>
        <p className="mt-4 text-mute">If you just placed an order, it was received. Your order reference is <strong className="text-ink">{reference.slice(0, 20)}</strong>. For privacy, full details are only shown using the private link from checkout.</p>
        <Link href="/products" className="btn-primary mt-8">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="container-x mx-auto max-w-2xl py-16">
      <div className="text-center">
        <div aria-hidden className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-lime text-2xl">✓</div>
        <h1 className="text-4xl font-bold">Thank you, {order.customerName.split(" ")[0]}</h1>
        <p className="mt-3 text-mute">Your order reference</p>
        <p className="mt-1 font-display text-3xl font-bold tracking-wider">{order.reference}</p>
        <p className="mt-2 text-sm text-mute">Save this page’s link to check on your order later.</p>
      </div>

      <div className="mt-8 rounded-xl2 border-2 border-dashed border-lime-deep bg-lime/30 p-5 text-sm">
        <strong>Demo order.</strong> This was placed with the store’s demo payment. No money has been charged and no real payment was processed.
      </div>

      <section className="card mt-8 p-6" aria-label="Order details">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Order details</h2>
          <span className="badge bg-sand text-ink">{STATUS[order.status]}</span>
        </div>
        <ul className="mt-4 divide-y divide-line text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-3"><span>{i.nameSnapshot} <span className="text-mute">× {i.quantity}</span></span><span className="tabular-nums">{formatMoney(i.linePaise, order.currency)}</span></li>
          ))}
        </ul>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-mute">Shipping</dt><dd>{order.shippingPaise === 0 ? "Free" : formatMoney(order.shippingPaise, order.currency)}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatMoney(order.totalPaise, order.currency)}</dd></div>
          <div className="flex justify-between text-mute"><dt>Payment</dt><dd>Demo payment (not charged)</dd></div>
        </dl>
        {order.trackingReference && <p className="mt-4 text-sm">Tracking reference: <strong>{order.trackingReference}</strong></p>}
        <div className="mt-6 text-sm text-mute">
          <p className="font-medium text-ink">Delivering to</p>
          <p>{order.customerName}<br />{order.shipLine1}{order.shipLine2 && `, ${order.shipLine2}`}<br />{order.shipCity}, {order.shipState} {order.shipPostalCode}</p>
        </div>
      </section>
      <div className="mt-10 text-center"><Link href="/products" className="btn-ghost">Continue shopping</Link></div>
    </div>
  );
}
