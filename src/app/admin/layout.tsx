import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false }, title: { default: "Store admin", template: "%s · Store admin" } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <main id="main" className="min-h-screen bg-paper">{children}</main>;
}
