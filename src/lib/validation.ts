import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);

export const specRow = z.object({ key: trimmed(60), value: trimmed(300) });

export const productInput = z
  .object({
    name: trimmed(140).min(2, "Please enter a product name"),
    slug: trimmed(90)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use only lowercase letters, numbers and dashes")
      .optional()
      .or(z.literal("")),
    shortDescription: trimmed(240).default(""),
    description: trimmed(8000).default(""),
    pricePaise: z.number().int().min(0).max(100_000_000),
    compareAtPaise: z.number().int().min(0).max(100_000_000).nullable(),
    sku: trimmed(60).nullable(),
    categoryName: trimmed(60).default(""),
    specifications: z.array(specRow).max(30),
    stock: z.number().int().min(0).max(1_000_000),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    weightGrams: z.number().int().min(0).max(1_000_000).nullable(),
    shippingNote: trimmed(300).default(""),
    seoTitle: trimmed(70).default(""),
    seoDescription: trimmed(170).default(""),
    images: z
      .array(z.object({ url: z.string().max(600), objectKey: z.string().max(300), alt: trimmed(160).default(""), width: z.number().int().nullable(), height: z.number().int().nullable() }))
      .max(10),
  })
  .refine((v) => v.compareAtPaise == null || v.compareAtPaise > v.pricePaise, {
    path: ["compareAtPaise"],
    message: "Original price must be higher than the selling price",
  });
export type ProductInput = z.infer<typeof productInput>;

export const checkoutInput = z.object({
  idempotencyKey: z.string().min(16).max(80),
  customer: z.object({
    name: trimmed(100).min(2, "Please enter your name"),
    email: trimmed(160).email("Please enter a valid email"),
    phone: trimmed(20).regex(/^[+]?[0-9 ()-]{7,18}$/, "Please enter a valid phone number"),
  }),
  shipping: z.object({
    line1: trimmed(160).min(3, "Please enter your address"),
    line2: trimmed(160).default(""),
    city: trimmed(80).min(2, "Please enter your city"),
    state: trimmed(80).min(2, "Please enter your state"),
    postalCode: trimmed(12).regex(/^[A-Za-z0-9 -]{4,10}$/, "Please enter a valid postal code"),
    country: trimmed(2).default("IN"),
    notes: trimmed(300).default(""),
  }),
  items: z
    .array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(20) }))
    .min(1, "Your cart is empty")
    .max(30),
});
export type CheckoutInput = z.infer<typeof checkoutInput>;

export const loginInput = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(1).max(200),
});
