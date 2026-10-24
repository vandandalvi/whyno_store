import type { Metadata } from "next";
import { EMPTY_PRODUCT, ProductForm } from "@/components/admin/ProductForm";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Add a product" };

export default async function NewProduct() {
  const cats = await db.category.findMany({ orderBy: { name: "asc" }, select: { name: true } });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Add a product</h1>
      <ProductForm initial={EMPTY_PRODUCT} categories={cats.map((c) => c.name)} />
    </div>
  );
}
