import { db } from "./db";

export type StoreSettings = {
  storeName: string;
  tagline: string;
  heroHeadline: string;
  heroSubtext: string;
  currency: string;
  contactEmail: string;
  contactPhone: string;
  businessAddress: string;
  legalBusinessName: string;
  shippingFlatPaise: number;
  freeShippingOverPaise: number; // 0 disables free shipping
  lowStockThreshold: number;
  shippingInfo: string;
  returnPolicy: string;
  privacyNote: string;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Whyno Store",
  tagline: "Thoughtfully made, simply delivered.",
  heroHeadline: "Simple things, beautifully made.",
  heroSubtext: "Discover our latest collection, chosen with care and delivered to your door.",
  currency: "INR",
  contactEmail: "",
  contactPhone: "",
  businessAddress: "",
  legalBusinessName: "",
  shippingFlatPaise: 5000,
  freeShippingOverPaise: 100000,
  lowStockThreshold: 5,
  shippingInfo: "Orders are dispatched within 2–3 working days. Delivery times vary by location.",
  returnPolicy: "Please contact us within 7 days of delivery if there is a problem with your order.",
  privacyNote: "We only collect the details needed to deliver your order and never store payment card information.",
};

export async function getSettings(): Promise<StoreSettings> {
  const row = await db.storeSetting.findUnique({ where: { key: "store" } });
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<StoreSettings> | null) ?? {}) };
}

export async function saveSettings(patch: Partial<StoreSettings>) {
  const merged = { ...(await getSettings()), ...patch };
  await db.storeSetting.upsert({
    where: { key: "store" },
    create: { key: "store", value: merged },
    update: { value: merged },
  });
  return merged;
}

export function shippingFor(subtotalPaise: number, s: Pick<StoreSettings, "shippingFlatPaise" | "freeShippingOverPaise">) {
  if (s.freeShippingOverPaise > 0 && subtotalPaise >= s.freeShippingOverPaise) return 0;
  return s.shippingFlatPaise;
}
