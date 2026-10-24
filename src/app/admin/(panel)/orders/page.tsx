import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { OrderBadge, PaymentBadge } from "@/components/StatusBadges";

export const metadata: Metadata = { title: "Orders" };
const STATUSES: OrderStatus[] = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];
const LABEL: Record<string, string> = { "": "All", PENDING: "New", PROCESSING: "Being prepared", SHIPPED: "Shipped", DELIVERED: "Delivered", CANCELLED: "Cancelled" };

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const status = STATUSES.find((s) => s === sp.status);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const take = 20;
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ reference: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }, { customerEmail: { contains: q, mode: "insensitive" } }, { customerPhone: { contains: q } }] } : {}),
  };
  const [orders, total] = await Promise.all([db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }), db.order.count({ where })]);
  const pages = Math.max(1, Math.ceil(total / take));
  const href = (over: Record<string, string>) => `/admin/orders?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...over })}`;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Orders</h1>
      <form className="flex flex-wrap gap-3" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <label htmlFor="q" className="sr-only">Search orders</label>
        <input id="q" name="q" defaultValue={q} type="search" placeholder="Order number, name, email or phone" className="input max-w-md" />
        <button className="btn-ghost">Search</button>
      </form>
      <ul className="flex flex-wrap gap-2" aria-label="Filter">
        {["", ...STATUSES].map((v) => (
          <li key={v}><Link href={href({ status: v })} className={`btn min-h-[44px] ${(status ?? "") === v ? "bg-ink text-white" : "border border-line bg-white hover:bg-sand"}`}>{LABEL[v]}</Link></li>
        ))}
      </ul>
      {orders.length === 0 ? (
        <div className="card p-12 text-center text-mute">{q || status ? "No orders match." : "No orders yet. They will appear here when customers check out."}</div>
      ) : (
        <ul className="card divide-y divide-line">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-sand/60">
                <div><p className="font-medium">{o.reference}</p><p className="text-sm text-mute">{o.customerName} · {o.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p></div>
                <div className="flex flex-wrap items-center gap-3"><PaymentBadge status={o.paymentStatus} /><OrderBadge status={o.status} /><span className="w-24 text-right font-semibold tabular-nums">{formatMoney(o.totalPaise, o.currency)}</span></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
          {page > 1 && <Link className="btn-ghost" href={href({ page: String(page - 1) })}>Previous</Link>}
          <span className="text-sm text-mute">Page {page} of {pages}</span>
          {page < pages && <Link className="btn-ghost" href={href({ page: String(page + 1) })}>Next</Link>}
        </nav>
      )}
    </div>
  );
}
