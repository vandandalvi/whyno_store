"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, Package, User } from "lucide-react";
import { authConfigured, firebaseSignOut, googleIdToken } from "@/lib/firebase-client";

type Me = { name: string; email: string; photoUrl: string } | null;

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.3-3.9 7.2-9.7 7.2-16.9z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.8 2.3-8.8 2.3-6.3 0-11.6-4-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export async function signInAndRefresh(router: ReturnType<typeof useRouter>): Promise<string | null> {
  try {
    const idToken = await googleIdToken();
    const res = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
    if (!res.ok) return (await res.json().catch(() => ({}))).error ?? "Sign-in failed. Please try again.";
    router.refresh();
    return null;
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (code.includes("popup-closed") || code.includes("cancelled")) return null;
    if (code.includes("unauthorized-domain")) return "This website isn’t yet authorised for Google sign-in. Please contact the store.";
    if (code.includes("popup-blocked")) return "Your browser blocked the sign-in window. Please allow pop-ups and try again.";
    return "Sign-in failed. Please try again.";
  }
}

export function SignInButton({ className = "", label = "Continue with Google" }: { className?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!authConfigured()) return null;
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className={`btn-ghost gap-3 ${className}`}
        onClick={async () => { setBusy(true); setErr(null); setErr(await signInAndRefresh(router)); setBusy(false); }}
      >
        <GoogleG />{busy ? "Signing in…" : label}
      </button>
      {err && <p role="alert" className="field-error">{err}</p>}
    </div>
  );
}

export function AccountMenu({ me }: { me: Me }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  if (!me) {
    return authConfigured() ? (
      <Link href="/account" className="flex h-11 items-center gap-2 rounded-full px-3 text-[15px] font-medium hover:bg-sand sm:px-4">
        <User className="h-5 w-5 sm:hidden" aria-label="Sign in" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    ) : null;
  }
  const initial = (me.name || me.email)[0]?.toUpperCase() ?? "?";
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label="Your account" className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-lime font-semibold ring-2 ring-transparent transition hover:ring-ink/20">
        {me.photoUrl ? <Image src={me.photoUrl} alt="" width={44} height={44} unoptimized referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : initial}
      </button>
      {open && (
        <div role="menu" className="rise absolute right-0 mt-2 w-64 overflow-hidden rounded-xl2 bg-white p-2 shadow-lift ring-1 ring-line">
          <div className="px-3 py-2"><p className="truncate font-medium">{me.name}</p><p className="truncate text-sm text-mute">{me.email}</p></div>
          <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 hover:bg-sand"><Package className="h-4 w-4" aria-hidden />My orders</Link>
          <button role="menuitem" type="button" className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-sand" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); await firebaseSignOut(); setOpen(false); router.push("/"); router.refresh(); }}>
            <LogOut className="h-4 w-4" aria-hidden />Sign out
          </button>
        </div>
      )}
    </div>
  );
}
