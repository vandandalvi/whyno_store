import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { appUrl } from "@/lib/env";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", display: "swap" });

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(appUrl()),
    title: { default: `${s.storeName} — ${s.tagline}`, template: `%s · ${s.storeName}` },
    description: s.heroSubtext,
    openGraph: { siteName: s.storeName, type: "website", images: [{ url: "/brand/social.png" }] },
    icons: { icon: "/brand/icon.svg" },
  };
}

export const viewport: Viewport = { themeColor: "#fbfbf9", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
