import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <div className="container-x mx-auto flex max-w-md flex-col py-20">
      <h1 className="text-center text-4xl font-bold">Store sign in</h1>
      <p className="mt-2 text-center text-mute">Sign in to manage products and orders.</p>
      <LoginForm />
    </div>
  );
}
