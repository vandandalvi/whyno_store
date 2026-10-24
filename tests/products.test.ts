import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { adminListProducts, getPublicProduct, listPublicProducts, removeProduct, saveProduct, ProductError } from "@/lib/products";
import { placeOrder } from "@/lib/orders";
import { productInput } from "@/lib/validation";
import { customer, key, resetDb, shipping } from "./helpers";
import { paiseToRupeesString, rupeesToPaise, formatMoney, discountPercent } from "@/lib/money";
import { sniffImage, validateImage } from "@/lib/storage";

beforeEach(resetDb);

const base = {
  name: "Cane Basket", shortDescription: "", description: "", pricePaise: 80000, compareAtPaise: null, sku: null,
  categoryName: "Baskets", specifications: [{ key: "Material", value: "Cane" }, { key: "", value: "ignored" }],
  stock: 4, status: "PUBLISHED" as const, weightGrams: null, shippingNote: "", seoTitle: "", seoDescription: "", images: [],
};
const parse = (o: object = {}) => productInput.parse({ ...base, ...o });

describe("product management", () => {
  it("creates, edits and publishes with slug, category, specs and stock movement", async () => {
    const { id, slug } = await saveProduct(parse());
    expect(slug).toBe("cane-basket");
    const p = await db.product.findUniqueOrThrow({ where: { id }, include: { category: true } });
    expect(p.category?.slug).toBe("baskets");
    expect(p.specifications).toEqual([{ key: "Material", value: "Cane" }]);
    expect(await getPublicProduct("cane-basket")).not.toBeNull();

    await saveProduct(parse({ stock: 9, pricePaise: 90000 }), id);
    expect((await db.product.findUniqueOrThrow({ where: { id } })).stock).toBe(9);
    expect(await db.inventoryMovement.count({ where: { productId: id, delta: 5, reason: "ADMIN_ADJUSTMENT" } })).toBe(1);
  });

  it("generates unique slugs and rejects clashing explicit slugs / SKUs", async () => {
    await saveProduct(parse({ sku: "A1" }));
    const second = await saveProduct(parse());
    expect(second.slug).toBe("cane-basket-2");
    await expect(saveProduct(parse({ slug: "cane-basket" }))).rejects.toBeInstanceOf(ProductError);
    await expect(saveProduct(parse({ sku: "A1" }))).rejects.toBeInstanceOf(ProductError);
  });

  it("validates price and stock input", () => {
    expect(() => parse({ pricePaise: -1 })).toThrow();
    expect(() => parse({ stock: -3 })).toThrow();
    expect(() => parse({ stock: 1.5 })).toThrow();
    expect(() => parse({ pricePaise: 1000, compareAtPaise: 900 })).toThrow();
    expect(() => parse({ name: "x" })).toThrow();
  });

  it("only shows published products publicly; drafts and archived stay hidden", async () => {
    await saveProduct(parse({ name: "Visible" }));
    const draft = await saveProduct(parse({ name: "Hidden Draft", status: "DRAFT" }));
    await saveProduct(parse({ name: "Gone", status: "ARCHIVED" }));
    const { items } = await listPublicProducts({});
    expect(items.map((i) => i.name)).toEqual(["Visible"]);
    expect(await getPublicProduct(draft.slug)).toBeNull();
    expect((await adminListProducts({})).items.map((i) => i.name).sort()).toEqual(["Hidden Draft", "Visible"]);
  });

  it("keeps sold-out published products visible (marked sold out by the UI)", async () => {
    await saveProduct(parse({ stock: 0 }));
    expect((await listPublicProducts({})).items).toHaveLength(1);
  });

  it("searches, filters by category and sorts by price", async () => {
    await saveProduct(parse({ name: "Cheap Mat", pricePaise: 1000, categoryName: "Mats" }));
    await saveProduct(parse({ name: "Pricey Basket", pricePaise: 9000 }));
    expect((await listPublicProducts({ q: "mat" })).items).toHaveLength(1);
    expect((await listPublicProducts({ category: "mats" })).items[0].name).toBe("Cheap Mat");
    expect((await listPublicProducts({ sort: "price-desc" })).items[0].name).toBe("Pricey Basket");
  });

  it("archives (not deletes) a product that has orders, deletes one that hasn't", async () => {
    const sold = await saveProduct(parse({ name: "Sold Item" }));
    await placeOrder({ idempotencyKey: key(), customer, shipping, items: [{ productId: sold.id, quantity: 1 }] });
    expect(await removeProduct(sold.id)).toBe("archived");
    expect((await db.product.findUniqueOrThrow({ where: { id: sold.id } })).status).toBe("ARCHIVED");
    const fresh = await saveProduct(parse({ name: "Never Sold" }));
    expect(await removeProduct(fresh.id)).toBe("deleted");
    expect(await db.product.findUnique({ where: { id: fresh.id } })).toBeNull();
  });

  it("refuses image references that were not issued by our upload endpoint", async () => {
    const evil = { url: "https://evil.example/x.png", objectKey: "../../etc/passwd", alt: "", width: null, height: null };
    await expect(saveProduct(parse({ images: [evil] }))).rejects.toBeInstanceOf(ProductError);
  });
});

describe("money", () => {
  it("parses and formats without floating point drift", () => {
    expect(rupeesToPaise("1,299.50")).toBe(129950);
    expect(rupeesToPaise("0.1")).toBe(10);
    expect(rupeesToPaise("19.99")).toBe(1999);
    expect(rupeesToPaise("abc")).toBeNull();
    expect(rupeesToPaise("-5")).toBeNull();
    expect(rupeesToPaise("1.234")).toBeNull();
    expect(paiseToRupeesString(129950)).toBe("1299.50");
    expect(formatMoney(129900).replace(/\s/g, "")).toBe("₹1,299");
    expect(discountPercent(75000, 100000)).toBe(25);
    expect(discountPercent(100, 100)).toBeNull();
  });
});

describe("image validation", () => {
  const png = (w: number, h: number) => {
    const b = Buffer.alloc(33);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b);
    b.writeUInt32BE(13, 8);
    b.write("IHDR", 12, "ascii");
    b.writeUInt32BE(w, 16);
    b.writeUInt32BE(h, 20);
    return b;
  };
  it("accepts real images and rejects disguised or invalid files", () => {
    expect(sniffImage(png(500, 500))).toBe("image/png");
    expect(validateImage(png(500, 400))).toMatchObject({ width: 500, height: 400 });
    expect(() => validateImage(Buffer.from("<script>alert(1)</script>".padEnd(64)))).toThrow();
    expect(() => validateImage(Buffer.from("GIF89a" + "x".repeat(60)))).toThrow();
    expect(() => validateImage(png(50, 50))).toThrow(/too small/);
    expect(() => validateImage(Buffer.alloc(6 * 1024 * 1024))).toThrow(/too large/);
    expect(() => validateImage(Buffer.alloc(0))).toThrow();
  });
});
