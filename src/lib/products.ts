import { Prisma, type ProductStatus } from "@prisma/client";
import { db } from "./db";
import { slugify } from "./slug";
import { deleteImage } from "./storage";
import type { ProductInput } from "./validation";

export const PAGE_SIZE = 12;

export type SpecRow = { key: string; value: string };
export const parseSpecs = (v: unknown): SpecRow[] =>
  Array.isArray(v) ? v.filter((r): r is SpecRow => !!r && typeof r.key === "string" && typeof r.value === "string") : [];

const publicWhere = (extra: Prisma.ProductWhereInput = {}): Prisma.ProductWhereInput => ({ status: "PUBLISHED", ...extra });

export type Sort = "newest" | "price-asc" | "price-desc";
const orderBy = (s: Sort): Prisma.ProductOrderByWithRelationInput[] =>
  s === "price-asc" ? [{ pricePaise: "asc" }] : s === "price-desc" ? [{ pricePaise: "desc" }] : [{ createdAt: "desc" }];

export async function listPublicProducts(opts: { q?: string; category?: string; sort?: Sort; page?: number; take?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const take = opts.take ?? PAGE_SIZE;
  const where = publicWhere({
    ...(opts.category ? { category: { slug: opts.category } } : {}),
    ...(opts.q
      ? { OR: [{ name: { contains: opts.q, mode: "insensitive" } }, { shortDescription: { contains: opts.q, mode: "insensitive" } }] }
      : {}),
  });
  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: orderBy(opts.sort ?? "newest"),
      skip: (page - 1) * take,
      take,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true },
    }),
    db.product.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / take)) };
}

export const getPublicProduct = (slug: string) =>
  db.product.findFirst({
    where: publicWhere({ slug }),
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
  });

export const listCategories = () =>
  db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    where: { products: { some: { status: "PUBLISHED" } } },
  });

export async function adminListProducts(opts: { q?: string; status?: ProductStatus | "LOW" | "OUT"; page?: number; take?: number }, lowThreshold = 5) {
  const page = Math.max(1, opts.page ?? 1);
  const take = opts.take ?? 20;
  const where: Prisma.ProductWhereInput = {
    ...(opts.q ? { OR: [{ name: { contains: opts.q, mode: "insensitive" } }, { sku: { contains: opts.q, mode: "insensitive" } }] } : {}),
    ...(opts.status === "LOW"
      ? { stock: { gt: 0, lte: lowThreshold }, status: { not: "ARCHIVED" } }
      : opts.status === "OUT"
        ? { stock: 0, status: { not: "ARCHIVED" } }
        : opts.status
          ? { status: opts.status }
          : { status: { not: "ARCHIVED" } }),
  };
  const [items, total] = await Promise.all([
    db.product.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * take, take, include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true } }),
    db.product.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / take)) };
}

export const adminGetProduct = (id: string) =>
  db.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } }, category: true } });

export class ProductError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
  }
}

function assertOwnImages(images: ProductInput["images"]) {
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  for (const img of images) {
    const okKey = /^products\/\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(img.objectKey);
    const okUrl = account
      ? img.url === `https://${account}.blob.core.windows.net/${process.env.AZURE_STORAGE_CONTAINER_NAME ?? "product-images"}/${img.objectKey}`
      : img.url === `/uploads/${img.objectKey}`;
    if (!okKey || !okUrl) throw new ProductError("One of the images isn't valid. Please upload it again.", "images");
  }
}

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "product";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const hit = await db.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!hit || hit.id === excludeId) return candidate;
  }
  return `${root}-${Date.now()}`;
}

async function resolveCategory(tx: Prisma.TransactionClient, name: string) {
  const clean = name.trim();
  if (!clean) return null;
  const slug = slugify(clean);
  if (!slug) return null;
  const cat = await tx.category.upsert({ where: { slug }, create: { name: clean, slug }, update: {} });
  return cat.id;
}

export async function saveProduct(input: ProductInput, id?: string): Promise<{ id: string; slug: string }> {
  assertOwnImages(input.images);
  const slug = input.slug ? input.slug : await uniqueSlug(input.name, id);
  if (input.slug) {
    const clash = await db.product.findUnique({ where: { slug }, select: { id: true } });
    if (clash && clash.id !== id) throw new ProductError("Another product already uses this web address.", "slug");
  }
  if (input.sku) {
    const clash = await db.product.findUnique({ where: { sku: input.sku }, select: { id: true } });
    if (clash && clash.id !== id) throw new ProductError("Another product already uses this SKU.", "sku");
  }

  const removedKeys: string[] = [];
  const saved = await db.$transaction(async (tx) => {
    const categoryId = await resolveCategory(tx, input.categoryName);
    const data = {
      name: input.name,
      slug,
      shortDescription: input.shortDescription,
      description: input.description,
      pricePaise: input.pricePaise,
      compareAtPaise: input.compareAtPaise,
      sku: input.sku || null,
      categoryId,
      specifications: input.specifications.filter((r) => r.key && r.value),
      stock: input.stock,
      status: input.status,
      weightGrams: input.weightGrams,
      shippingNote: input.shippingNote,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
    };
    let productId = id;
    if (id) {
      const before = await tx.product.findUniqueOrThrow({ where: { id }, include: { images: true } });
      await tx.product.update({ where: { id }, data });
      if (before.stock !== input.stock) {
        await tx.inventoryMovement.create({ data: { productId: id, delta: input.stock - before.stock, reason: "ADMIN_ADJUSTMENT" } });
      }
      const keep = new Set(input.images.map((i) => i.objectKey));
      removedKeys.push(...before.images.filter((i) => !keep.has(i.objectKey)).map((i) => i.objectKey));
      await tx.productImage.deleteMany({ where: { productId: id } });
    } else {
      const created = await tx.product.create({ data });
      productId = created.id;
      if (input.stock > 0) await tx.inventoryMovement.create({ data: { productId, delta: input.stock, reason: "INITIAL" } });
    }
    if (input.images.length) {
      await tx.productImage.createMany({
        data: input.images.map((img, i) => ({ productId: productId!, url: img.url, objectKey: img.objectKey, alt: img.alt || input.name, width: img.width, height: img.height, sortOrder: i })),
      });
    }
    return { id: productId!, slug };
  });
  await Promise.all(removedKeys.map(deleteImage));
  return saved;
}

/** Products with orders are archived to protect history; never-ordered drafts can be removed. */
export async function removeProduct(id: string): Promise<"deleted" | "archived"> {
  const ordered = await db.orderItem.count({ where: { productId: id } });
  if (ordered > 0) {
    await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    return "archived";
  }
  const imgs = await db.productImage.findMany({ where: { productId: id }, select: { objectKey: true } });
  await db.product.delete({ where: { id } });
  await Promise.all(imgs.map((i) => deleteImage(i.objectKey)));
  return "deleted";
}
