import { json } from "@/lib/http";
import { listCategories } from "@/lib/products";

export async function GET() {
  return json((await listCategories()).map((c) => ({ name: c.name, slug: c.slug })));
}
