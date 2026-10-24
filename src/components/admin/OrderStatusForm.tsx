"use client";

import { useActionState } from "react";
import { updateOrderAction } from "@/app/admin/actions";

export function OrderStatusForm({ id, status, tracking, options }: { id: string; status: string; tracking: string; options: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState(updateOrderAction, undefined);
  const locked = options.length <= 1;
  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="id" value={id} />
      {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{state.error}</p>}
      {state?.ok && <p role="status" className="rounded-xl bg-lime/50 px-4 py-3 text-sm font-medium">{state.ok}</p>}
      <div>
        <label htmlFor="status" className="label">Status</label>
        <select id="status" name="status" className="input" defaultValue={status} disabled={locked}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {locked && <p className="hint">This order is finished and can’t be changed.</p>}
      </div>
      <div>
        <label htmlFor="tracking" className="label">Tracking number (optional)</label>
        <input id="tracking" name="tracking" className="input" defaultValue={tracking} maxLength={120} disabled={locked} />
      </div>
      <p className="hint">Choosing “Cancelled” puts the items back in stock.</p>
      <button className="btn-primary w-full" disabled={pending || locked}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
