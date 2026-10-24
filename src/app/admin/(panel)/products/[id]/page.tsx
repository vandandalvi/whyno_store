import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { db } from "@/lib/db";
import { paiseToRupeesString } from "@/lib/money";
import { adminGetProduct, parseSpecs } from "@/lib/products";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, cats] = await Promise.all([adminGetProduct(id), db.category.findMany({ orderBy: { name: "asc" }, select: { name: true } })]);
  if (!p) notFound();
  const specs = parseSpecs(p.specifications);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Edit product</h1>
        {p.status === "PUBLISHED" && <Link href={`/products/${p.slug}`} target="_blank" className="btn-ghost">See it in the shop ↗</Link>}
      </div>
      <ProductForm
        categories={cats.map((c) => c.name)}
        initial={{
          id: p.id, name: p.name, slug: p.slug, shortDescription: p.shortDescription, description: p.description,
          price: paiseToRupeesString(p.pricePaise), compareAt: paiseToRupeesString(p.compareAtPaise), sku: p.sku ?? "",
          categoryName: p.category?.name ?? "", specifications: specs.length ? specs : [{ key: "", value: "" }],
          stock: String(p.stock), status: p.status, weightGrams: p.weightGrams?.toString() ?? "", shippingNote: p.shippingNote,
          seoTitle: p.seoTitle, seoDescription: p.seoDescription,
          images: p.images.map((i) => ({ url: i.url, objectKey: i.objectKey, alt: i.alt, width: i.width, height: i.height })),
        }}
      />
    </div>
  );
}
