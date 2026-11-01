"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { deleteProductAction, saveProductAction } from "@/app/admin/actions";
import { formatMoney, rupeesToPaise } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { ConfirmDialog } from "./ConfirmDialog";
import { ImageUploader, type Img } from "./ImageUploader";

export type ProductFormValues = {
  id?: string;
  name: string; slug: string; shortDescription: string; description: string;
  price: string; compareAt: string; sku: string; categoryName: string;
  specifications: { key: string; value: string }[];
  stock: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  weightGrams: string; shippingNote: string; seoTitle: string; seoDescription: string;
  images: Img[];
};

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "", slug: "", shortDescription: "", description: "", price: "", compareAt: "", sku: "", categoryName: "",
  specifications: [{ key: "", value: "" }], stock: "0", status: "DRAFT", weightGrams: "", shippingNote: "", seoTitle: "", seoDescription: "", images: [],
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-5 p-6 sm:p-8">
      <div><h2 className="text-xl font-semibold">{title}</h2>{hint && <p className="hint">{hint}</p>}</div>
      {children}
    </section>
  );
}

export function ProductForm({ initial, categories }: { initial: ProductFormValues; categories: string[] }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initial.slug);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const set = <K extends keyof ProductFormValues>(k: K, val: ProductFormValues[K]) => { setV((p) => ({ ...p, [k]: val })); setDirty(true); };
  const text = (k: keyof ProductFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never);
  const err = (k: string) => errors[k] && <p className="field-error" role="alert">{errors[k]}</p>;

  function save(statusOverride?: ProductFormValues["status"]) {
    const local: Record<string, string> = {};
    const price = rupeesToPaise(v.price);
    const compare = v.compareAt.trim() ? rupeesToPaise(v.compareAt) : null;
    const stock = Number(v.stock);
    if (price == null) local.pricePaise = "Enter a price like 499 or 499.50";
    if (v.compareAt.trim() && compare == null) local.compareAtPaise = "Enter a price like 599";
    if (!Number.isInteger(stock) || stock < 0) local.stock = "Enter a whole number, 0 or more";
    if (v.weightGrams.trim() && !/^\d+$/.test(v.weightGrams.trim())) local.weightGrams = "Enter grams as a whole number";
    if (Object.keys(local).length) { setErrors(local); setBanner("Please fix the highlighted fields."); return; }

    setBanner(null);
    setErrors({});
    startTransition(async () => {
      const res = await saveProductAction(
        {
          name: v.name, slug: v.slug.trim(), shortDescription: v.shortDescription, description: v.description,
          pricePaise: price, compareAtPaise: compare, sku: v.sku.trim() || null, categoryName: v.categoryName,
          specifications: v.specifications.filter((r) => r.key.trim() || r.value.trim()),
          stock, status: statusOverride ?? v.status, weightGrams: v.weightGrams.trim() ? Number(v.weightGrams) : null,
          shippingNote: v.shippingNote, seoTitle: v.seoTitle, seoDescription: v.seoDescription, images: v.images,
        },
        v.id,
      );
      if (res.error || !res.id) {
        setErrors(res.fields ?? {});
        setBanner(res.error ?? "We couldn’t save. Please try again.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setDirty(false);
      router.push("/admin/products?saved=1");
      router.refresh();
    });
  }

  const priceP = rupeesToPaise(v.price);
  const compareP = v.compareAt.trim() ? rupeesToPaise(v.compareAt) : null;

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-8 pb-28 xl:grid-cols-[1fr_340px] xl:pb-0">
      <div className="space-y-8">
        {banner && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-800">{banner}</div>}

        <Section title="The basics">
          <div>
            <label htmlFor="name" className="label">Product name</label>
            <input id="name" className="input" value={v.name} maxLength={140} required onChange={(e) => { set("name", e.target.value); if (!slugTouched) setV((p) => ({ ...p, name: e.target.value, slug: slugify(e.target.value) })); }} aria-invalid={!!errors.name} />
            {err("name")}
          </div>
          <div>
            <label htmlFor="short" className="label">Short description</label>
            <input id="short" className="input" value={v.shortDescription} maxLength={240} onChange={text("shortDescription")} />
            <p className="hint">One or two lines shown under the name.</p>
          </div>
          <div>
            <label htmlFor="desc" className="label">Full description</label>
            <textarea id="desc" className="input" rows={6} value={v.description} maxLength={8000} onChange={text("description")} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="cat" className="label">Category</label>
              <input id="cat" list="cats" className="input" value={v.categoryName} maxLength={60} onChange={text("categoryName")} placeholder="e.g. Baskets" />
              <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              <p className="hint">Pick one or type a new one.</p>
            </div>
            <div>
              <label htmlFor="sku" className="label">SKU (optional)</label>
              <input id="sku" className="input" value={v.sku} maxLength={60} onChange={text("sku")} />
              {err("sku")}
            </div>
          </div>
        </Section>

        <Section title="Price and stock">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="price" className="label">Selling price (₹)</label>
              <input id="price" className="input" inputMode="decimal" value={v.price} required onChange={text("price")} placeholder="499" aria-invalid={!!errors.pricePaise} />
              {err("pricePaise")}
            </div>
            <div>
              <label htmlFor="cmp" className="label">Original price (₹, optional)</label>
              <input id="cmp" className="input" inputMode="decimal" value={v.compareAt} onChange={text("compareAt")} placeholder="599" />
              <p className="hint">Shows a “% off” tag if higher than the selling price.</p>
              {err("compareAtPaise")}
            </div>
            <div>
              <label htmlFor="stock" className="label">How many in stock</label>
              <input id="stock" className="input" inputMode="numeric" value={v.stock} required onChange={text("stock")} />
              {err("stock")}
            </div>
          </div>
        </Section>

        <Section title="Photos" hint="The first photo is the main one shown in the shop.">
          <ImageUploader images={v.images} onChange={(imgs) => set("images", imgs)} />
          {err("images")}
        </Section>

        <Section title="Details" hint="For example: Material — Bamboo, Colour — Natural.">
          <ul className="space-y-3">
            {v.specifications.map((r, i) => (
              <li key={i} className="grid grid-cols-[1fr_auto] items-start gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1fr_auto] sm:border-0 sm:p-0">
                <div><label className="sr-only" htmlFor={`k${i}`}>Detail name {i + 1}</label><input id={`k${i}`} className="input" placeholder="e.g. Material" maxLength={60} value={r.key} onChange={(e) => set("specifications", v.specifications.map((x, n) => (n === i ? { ...x, key: e.target.value } : x)))} /></div>
                <div><label className="sr-only" htmlFor={`v${i}`}>Detail value {i + 1}</label><input id={`v${i}`} className="input" placeholder="e.g. Bamboo" maxLength={300} value={r.value} onChange={(e) => set("specifications", v.specifications.map((x, n) => (n === i ? { ...x, value: e.target.value } : x)))} /></div>
                <button type="button" className="btn-ghost row-span-2 !min-h-[48px] !px-3 sm:row-span-1" aria-label={`Remove detail ${i + 1}`} onClick={() => set("specifications", v.specifications.filter((_, n) => n !== i))}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-ghost" onClick={() => set("specifications", [...v.specifications, { key: "", value: "" }])} disabled={v.specifications.length >= 30}><Plus className="h-4 w-4" />Add another detail</button>
        </Section>

        <details className="card p-6 sm:p-8">
          <summary className="cursor-pointer text-xl font-semibold">More options (shipping, web address, search engines)</summary>
          <div className="mt-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="weight" className="label">Weight in grams (optional)</label><input id="weight" className="input" inputMode="numeric" value={v.weightGrams} onChange={text("weightGrams")} />{err("weightGrams")}</div>
              <div>
                <label htmlFor="slug" className="label">Web address</label>
                <input id="slug" className="input" value={v.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase()); }} />
                <p className="hint">/products/{v.slug || slugify(v.name) || "your-product"}</p>{err("slug")}
              </div>
            </div>
            <div><label htmlFor="ship" className="label">Special shipping note (optional)</label><input id="ship" className="input" value={v.shippingNote} maxLength={300} onChange={text("shippingNote")} /></div>
            <div><label htmlFor="seot" className="label">Google title (optional)</label><input id="seot" className="input" value={v.seoTitle} maxLength={70} onChange={text("seoTitle")} /></div>
            <div><label htmlFor="seod" className="label">Google description (optional)</label><textarea id="seod" className="input" rows={2} value={v.seoDescription} maxLength={170} onChange={text("seoDescription")} /></div>
          </div>
        </details>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
        <section className="card space-y-4 p-6" aria-labelledby="vis">
          <h2 id="vis" className="text-xl font-semibold">Show in shop?</h2>
          <fieldset className="space-y-2">
            <legend className="sr-only">Visibility</legend>
            {([["PUBLISHED", "Yes — visible to customers"], ["DRAFT", "No — keep hidden for now"]] as const).map(([val, label]) => (
              <label key={val} className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border px-4 ${v.status === val ? "border-ink bg-lime/30" : "border-line"}`}>
                <input type="radio" name="status" className="h-5 w-5 accent-black" checked={v.status === val} onChange={() => set("status", val)} />{label}
              </label>
            ))}
          </fieldset>
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save product"}</button>
          <button type="button" className="btn-ghost w-full" onClick={() => { if (!dirty || confirm("Leave without saving your changes?")) router.push("/admin/products"); }}>Cancel</button>
        </section>

        <section className="card overflow-hidden" aria-label="Preview">
          <p className="px-6 pt-5 text-sm font-medium text-mute">Preview — how it looks in the shop</p>
          <div className="p-6">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl2 bg-sand">
              {v.images[0] ? <Image src={v.images[0].url} alt="" fill sizes="300px" className="object-cover" unoptimized /> : <div className="flex h-full items-center justify-center text-sm text-mute">No photo yet</div>}
            </div>
            <p className="mt-4 text-[17px] font-medium">{v.name || "Product name"}</p>
            <p className="mt-1 flex items-baseline gap-2"><span className="font-semibold">{priceP != null ? formatMoney(priceP) : "₹—"}</span>{compareP != null && priceP != null && compareP > priceP && <s className="text-sm text-mute">{formatMoney(compareP)}</s>}</p>
            {Number(v.stock) <= 0 && <p className="mt-1 text-sm font-medium text-red-700">Will show as “Sold out”</p>}
          </div>
        </section>

        {v.id && (
          <button type="button" className="btn-danger w-full" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" />Remove this product</button>
        )}
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur xl:hidden">
        <button type="button" className="btn-ghost" onClick={() => { if (!dirty || confirm("Leave without saving your changes?")) router.push("/admin/products"); }}>Cancel</button>
        <button className="btn-primary flex-1" disabled={pending}>{pending ? "Saving…" : "Save product"}</button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        danger
        busy={pending}
        title="Remove this product?"
        body="If customers have already ordered it, it will be archived (hidden) so past orders stay accurate. Otherwise it will be deleted for good."
        confirmLabel="Yes, remove it"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => startTransition(async () => { await deleteProductAction(v.id!); setDirty(false); router.push("/admin/products?removed=1"); router.refresh(); })}
      />
    </form>
  );
}
