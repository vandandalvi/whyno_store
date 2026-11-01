import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { OrderBadge } from "@/components/StatusBadges";

export const metadata: Metadata = { title: "Admin" };

function Stat({ label, value, href, tone = "" }: { label: string; value: number; href?: string; tone?: string }) {
  const inner = (
    <div className={`card p-6 transition hover:shadow-lift ${tone}`}>
      <p className="text-4xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-mute">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function Dashboard() {
  const s = await getSettings();
  const [total, published, low, out, orders, newOrders, recent] = await Promise.all([
    db.product.count({ where: { status: { not: "ARCHIVED" } } }),
    db.product.count({ where: { status: "PUBLISHED" } }),
    db.product.count({ where: { status: { not: "ARCHIVED" }, stock: { gt: 0, lte: s.lowStockThreshold } } }),
    db.product.count({ where: { status: { not: "ARCHIVED" }, stock: 0 } }),
    db.order.count(),
    db.order.count({ where: { status: "PENDING" } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold sm:text-4xl">Welcome back</h1>
        <Link href="/admin/products/new" className="btn-lime">+ Add a product</Link>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Products" value={total} href="/admin/products" />
        <Stat label="Visible in shop" value={published} href="/admin/products?status=PUBLISHED" />
        <Stat label="Running low" value={low} href="/admin/products?status=LOW" tone={low ? "ring-2 ring-amber-300" : ""} />
        <Stat label="Sold out" value={out} href="/admin/products?status=OUT" tone={out ? "ring-2 ring-red-200" : ""} />
        <Stat label="Orders" value={orders} href="/admin/orders" />
        <Stat label="New orders to handle" value={newOrders} href="/admin/orders?status=PENDING" tone={newOrders ? "ring-2 ring-lime-deep" : ""} />
      </div>
      <section aria-labelledby="recent">
        <div className="mb-4 flex items-center justify-between"><h2 id="recent" className="text-2xl font-semibold">Recent orders</h2><Link href="/admin/orders" className="tap text-sm underline underline-offset-4">See all</Link></div>
        {recent.length === 0 ? (
          <p className="card p-8 text-center text-mute">No orders yet. They will appear here as soon as someone checks out.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {recent.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-sand/60">
                  <div><p className="font-medium">{o.reference}</p><p className="text-sm text-mute">{o.customerName} · {o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p></div>
                  <div className="flex items-center gap-3"><OrderBadge status={o.status} /><span className="font-semibold tabular-nums">{formatMoney(o.totalPaise, o.currency)}</span></div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
