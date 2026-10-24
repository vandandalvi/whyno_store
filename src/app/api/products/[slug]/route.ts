import { fail, json } from "@/lib/http";
import { getPublicProduct, parseSpecs } from "@/lib/products";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = await getPublicProduct((await params).slug);
  if (!p) return fail("Product not found.", 404);
  return json({
    id: p.id, slug: p.slug, name: p.name, shortDescription: p.shortDescription, description: p.description,
    pricePaise: p.pricePaise, compareAtPaise: p.compareAtPaise, inStock: p.stock > 0,
    specifications: parseSpecs(p.specifications), category: p.category?.slug ?? null,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
  });
}
