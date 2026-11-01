import { CartProvider } from "@/components/CartProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCustomer } from "@/lib/customer-auth";
import { getSettings } from "@/lib/settings";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [s, me] = await Promise.all([getSettings(), getCustomer()]);
  return (
    <CartProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Header storeName={s.storeName} me={me ? { name: me.name, email: me.email, photoUrl: me.photoUrl } : null} />
      <main id="main" className="min-h-[70vh]">{children}</main>
      <Footer s={s} />
    </CartProvider>
  );
}
