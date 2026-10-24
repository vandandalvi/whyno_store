import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";

const PAGES = { shipping: "Shipping", returns: "Returns", privacy: "Privacy" } as const;
type Slug = keyof typeof PAGES;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: PAGES[slug as Slug] ?? "Policy" };
}

export default async function Policy({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in PAGES)) notFound();
  const s = await getSettings();
  const body = slug === "shipping" ? s.shippingInfo : slug === "returns" ? s.returnPolicy : s.privacyNote;
  return (
    <div className="container-x mx-auto max-w-2xl py-16">
      <h1 className="text-4xl font-bold">{PAGES[slug as Slug]}</h1>
      <p className="mt-6 whitespace-pre-line text-lg text-mute">{body}</p>
      <div className="mt-10 rounded-xl2 bg-sand p-5 text-sm text-mute">
        <p className="font-medium text-ink">{s.legalBusinessName || s.storeName}</p>
        {s.businessAddress && <p className="whitespace-pre-line">{s.businessAddress}</p>}
        {s.contactEmail && <p>{s.contactEmail}</p>}
        {s.contactPhone && <p>{s.contactPhone}</p>}
      </div>
    </div>
  );
}
