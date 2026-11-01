import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@/components/AccountMenu";
import { OrderBadge } from "@/components/StatusBadges";
import { getCustomer } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const me = await getCustomer();

  if (!me) {
    return (
      <div className="container-x py-16 sm:py-24">
        <div className="mx-auto max-w-md overflow-hidden rounded-xl3 bg-ink text-center text-white shadow-lift">
          <div className="bg-[radial-gradient(70%_60%_at_50%_0%,rgba(227,239,118,.35),transparent)] px-8 pb-10 pt-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark.png" alt="" width={72} height={72} className="mx-auto h-[72px] w-[72px] rounded-2xl" />
            <h1 className="mt-6 text-3xl font-bold">Welcome to Whyno</h1>
            <p className="mt-3 text-white/70">Sign in with the same Google account you use in the Whyno keyboard and extension to see your orders and check out faster.</p>
            <div className="mt-8 flex justify-center [&_button]:border-0 [&_button]:bg-white [&_button]:text-ink"><SignInButton /></div>
            <p className="mt-6 text-xs text-white/50">No account needed to shop — you can also <Link href="/products" className="underline">continue as a guest</Link>.</p>
          </div>
        </div>
      </div>
    );
  }

  const orders = await db.order.findMany({ where: { customerId: me.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="container-x mx-auto max-w-3xl py-12">
      <h1 className="text-4xl font-bold">Hi, {me.name.split(" ")[0] || "there"}</h1>
      <p className="mt-1 text-mute">{me.email}</p>
      <h2 className="mt-10 text-2xl font-semibold">Your orders</h2>
      {orders.length === 0 ? (
        <div className="card mt-4 p-10 text-center">
          <p className="text-mute">You haven’t placed an order yet.</p>
          <Link href="/products" className="btn-primary mt-5">Start shopping</Link>
        </div>
      ) : (
        <ul className="card mt-4 divide-y divide-line">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/order/${o.reference}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-sand/60 sm:px-6">
                <div><p className="font-medium">{o.reference}</p><p className="text-sm text-mute">{o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p></div>
                <div className="flex items-center gap-3"><OrderBadge status={o.status} /><span className="font-semibold tabular-nums">{formatMoney(o.totalPaise, o.currency)}</span></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
