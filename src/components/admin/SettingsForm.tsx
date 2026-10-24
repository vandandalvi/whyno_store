"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/app/admin/actions";
import type { StoreSettings } from "@/lib/settings";

function T({ name, label, defaultValue, hint, error, area, type = "text" }: { name: string; label: string; defaultValue: string | number; hint?: string; error?: string; area?: boolean; type?: string }) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      {area ? <textarea id={name} name={name} rows={3} className="input" defaultValue={defaultValue} /> : <input id={name} name={name} type={type} className="input" defaultValue={defaultValue} />}
      {hint && <p className="hint">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function SettingsForm({ s }: { s: StoreSettings }) {
  const [state, action, pending] = useActionState(saveSettingsAction, undefined);
  const e = state?.fields ?? {};
  return (
    <form action={action} className="max-w-3xl space-y-8">
      {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 font-medium text-red-800">{state.error}</p>}
      {state?.ok && <p role="status" className="rounded-xl bg-lime/50 px-4 py-3 font-medium">{state.ok} Changes are live.</p>}
      <section className="card space-y-5 p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Shop front page</h2>
        <T name="storeName" label="Shop name" defaultValue={s.storeName} error={e.storeName} />
        <T name="tagline" label="Tagline" defaultValue={s.tagline} />
        <T name="heroHeadline" label="Big headline on the home page" defaultValue={s.heroHeadline} />
        <T name="heroSubtext" label="Line under the headline" defaultValue={s.heroSubtext} />
      </section>
      <section className="card space-y-5 p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Contact and business details</h2>
        <T name="legalBusinessName" label="Business name" defaultValue={s.legalBusinessName} />
        <T name="contactEmail" label="Contact email" type="email" defaultValue={s.contactEmail} error={e.contactEmail} />
        <T name="contactPhone" label="Contact phone" defaultValue={s.contactPhone} />
        <T name="businessAddress" label="Business address" area defaultValue={s.businessAddress} />
      </section>
      <section className="card space-y-5 p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Shipping and stock</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <T name="shippingFlat" label="Shipping charge (₹)" type="number" defaultValue={s.shippingFlatPaise / 100} error={e.shippingFlat} />
          <T name="freeShippingOver" label="Free shipping above (₹)" type="number" defaultValue={s.freeShippingOverPaise / 100} hint="0 turns this off" error={e.freeShippingOver} />
          <T name="lowStockThreshold" label="Warn when stock is" type="number" defaultValue={s.lowStockThreshold} hint="this many or fewer" error={e.lowStockThreshold} />
        </div>
      </section>
      <section className="card space-y-5 p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Policies shown to customers</h2>
        <T name="shippingInfo" label="Shipping information" area defaultValue={s.shippingInfo} />
        <T name="returnPolicy" label="Returns policy" area defaultValue={s.returnPolicy} />
        <T name="privacyNote" label="Privacy note" area defaultValue={s.privacyNote} />
      </section>
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
