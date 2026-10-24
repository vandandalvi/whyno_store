"use client";

import { useEffect, useRef } from "react";

export function ConfirmDialog({ open, title, body, confirmLabel, danger, busy, onConfirm, onCancel }: {
  open: boolean; title: string; body: string; confirmLabel: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onCancel(); }} aria-labelledby="dlg-title" className="w-[min(92vw,28rem)] rounded-xl3 p-0 shadow-lift backdrop:bg-black/40">
      <div className="p-8">
        <h2 id="dlg-title" className="text-2xl font-semibold">{title}</h2>
        <p className="mt-3 text-mute">{body}</p>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onCancel} autoFocus>Keep it</button>
          <button type="button" className={danger ? "btn bg-red-700 text-white hover:bg-red-800" : "btn-primary"} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}
