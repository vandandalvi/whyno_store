import type { Metadata } from "next";
import { getCustomer } from "@/lib/customer-auth";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const me = await getCustomer();
  return <CheckoutClient prefill={me ? { name: me.name, email: me.email } : undefined} />;
}
