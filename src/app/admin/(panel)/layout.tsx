import Link from "next/link";
import { Home, Package, Receipt, Settings } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Home", Icon: Home },
  { href: "/admin/products", label: "Products", Icon: Package },
  { href: "/admin/orders", label: "Orders", Icon: Receipt },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="container-x py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <nav aria-label="Admin" className="flex flex-wrap gap-2">
          {NAV.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="btn-ghost min-h-[48px] px-5"><Icon className="h-4 w-4" aria-hidden />{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm text-mute">
          <Link href="/" target="_blank" className="tap underline underline-offset-4 hover:text-ink">View shop</Link>
          <span className="hidden sm:inline">{admin.email}</span>
          <form action={logoutAction}><button className="btn-ghost min-h-[44px] px-4">Sign out</button></form>
        </div>
      </div>
      <div className="pt-8">{children}</div>
    </div>
  );
}
