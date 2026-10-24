"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { login, logout, requireAdmin } from "@/lib/auth";
import { OrderUpdateError, updateOrderStatus } from "@/lib/orders";
import { ProductError, removeProduct, saveProduct } from "@/lib/products";
import { allow, clientIp } from "@/lib/ratelimit";
import { saveSettings } from "@/lib/settings";
import { loginInput, productInput, type ProductInput } from "@/lib/validation";

export type FormState = { error?: string; fields?: Record<string, string>; ok?: string } | undefined;

function refreshStorefront(slug?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/products");
  if (slug) revalidatePath(`/products/${slug}`);
}

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = loginInput.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "That email or password isn't right. Please try again." };
  const ip = await clientIp();
  if (!(await allow(`login:${ip}`, 30, 15 * 60_000))) return { error: "Too many attempts. Please wait 15 minutes and try again." };
  const res = await login(parsed.data.email, parsed.data.password, ip);
  if (!res.ok) return { error: res.error };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

export async function saveProductAction(raw: unknown, id?: string): Promise<{ error?: string; fields?: Record<string, string>; id?: string }> {
  const admin = await requireAdmin();
  const parsed = productInput.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0] ?? "form")] ??= i.message;
    return { error: "Please fix the highlighted fields.", fields };
  }
  try {
    const saved = await saveProduct(parsed.data as ProductInput, id);
    await audit(admin.id, id ? "product.update" : "product.create", "Product", saved.id, parsed.data.name);
    refreshStorefront(saved.slug);
    return { id: saved.id };
  } catch (e) {
    if (e instanceof ProductError) return { error: e.message, fields: e.field ? { [e.field]: e.message } : undefined };
    console.error(JSON.stringify({ evt: "product_save_error", msg: e instanceof Error ? e.message : "unknown" }));
    return { error: "We couldn’t save this product. Please try again." };
  }
}

export async function deleteProductAction(id: string): Promise<{ result: "deleted" | "archived" }> {
  const admin = await requireAdmin();
  const result = await removeProduct(z.string().min(1).parse(id));
  await audit(admin.id, `product.${result}`, "Product", id);
  refreshStorefront();
  return { result };
}

export async function setProductStatusAction(id: string, status: "DRAFT" | "PUBLISHED") {
  const admin = await requireAdmin();
  const p = await (await import("@/lib/db")).db.product.update({ where: { id }, data: { status } });
  await audit(admin.id, `product.${status.toLowerCase()}`, "Product", id, p.name);
  refreshStorefront(p.slug);
  revalidatePath("/admin/products");
}

export async function updateOrderAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      id: z.string().min(1),
      status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
      tracking: z.string().trim().max(120).optional(),
    })
    .safeParse({ id: form.get("id"), status: form.get("status"), tracking: form.get("tracking") ?? undefined });
  if (!parsed.success) return { error: "Please choose a valid status." };
  try {
    await updateOrderStatus(parsed.data.id, parsed.data.status as OrderStatus, parsed.data.tracking);
    await audit(admin.id, "order.status", "Order", parsed.data.id, parsed.data.status);
    revalidatePath(`/admin/orders/${parsed.data.id}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    refreshStorefront();
    return { ok: "Order updated." };
  } catch (e) {
    return { error: e instanceof OrderUpdateError ? e.message : "We couldn’t update the order. Please try again." };
  }
}

const money = z.coerce.number().min(0).max(1_000_000);
const settingsSchema = z.object({
  storeName: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(140),
  heroHeadline: z.string().trim().max(120),
  heroSubtext: z.string().trim().max(240),
  contactEmail: z.string().trim().email().max(160).or(z.literal("")),
  contactPhone: z.string().trim().max(30),
  legalBusinessName: z.string().trim().max(120),
  businessAddress: z.string().trim().max(400),
  shippingFlat: money,
  freeShippingOver: money,
  lowStockThreshold: z.coerce.number().int().min(0).max(1000),
  shippingInfo: z.string().trim().max(2000),
  returnPolicy: z.string().trim().max(4000),
  privacyNote: z.string().trim().max(4000),
});

export async function saveSettingsAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= "Please check this value";
    return { error: "Please fix the highlighted fields.", fields };
  }
  const { shippingFlat, freeShippingOver, ...rest } = parsed.data;
  await saveSettings({ ...rest, shippingFlatPaise: Math.round(shippingFlat * 100), freeShippingOverPaise: Math.round(freeShippingOver * 100) });
  await audit(admin.id, "settings.update", "StoreSetting", "store");
  refreshStorefront();
  return { ok: "Saved." };
}
