/** Local development only: adds clearly marked demo products. Refuses to run in production. */
import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV === "production" || process.env.ALLOW_SEED !== "1" && /azure|railway|rds\.amazonaws/i.test(process.env.DATABASE_URL ?? "")) {
  console.error("Refusing to seed a production-looking database.");
  process.exit(1);
}

const db = new PrismaClient();

const demo = [
  { name: "Demo Bamboo Tray", cat: "Home", price: 129900, compare: 159900, stock: 12, specs: [["Material", "Bamboo"], ["Dimensions", "30 × 20 cm"], ["Care", "Wipe clean"]] },
  { name: "Demo Cane Basket", cat: "Home", price: 89900, compare: null, stock: 3, specs: [["Material", "Cane"]] },
  { name: "Demo Cotton Tote", cat: "Bags", price: 49900, compare: null, stock: 0, specs: [["Material", "Organic cotton"]] },
];

async function main() {
  for (const d of demo) {
    const slug = d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const cat = await db.category.upsert({ where: { slug: d.cat.toLowerCase() }, create: { name: d.cat, slug: d.cat.toLowerCase() }, update: {} });
    await db.product.upsert({
      where: { slug },
      update: {},
      create: {
        name: d.name, slug, pricePaise: d.price, compareAtPaise: d.compare, stock: d.stock, status: "PUBLISHED", categoryId: cat.id,
        shortDescription: "Demo product for local testing — not a real item.",
        description: "This is demo content seeded for local development.",
        specifications: d.specs.map(([key, value]) => ({ key, value })),
      },
    });
  }
  console.log(`Seeded ${demo.length} demo products.`);
}

main().finally(() => db.$disconnect());
