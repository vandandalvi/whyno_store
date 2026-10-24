// All money is stored as integer paise (1/100 of a rupee). No floats in calculations.

export function formatMoney(paise: number, currency = "INR"): string {
  const major = paise / 100;
  const whole = Number.isInteger(major);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major);
}

/** Parses "1,299.50" or "1299" into paise. Returns null when invalid. */
export function rupeesToPaise(input: string): number | null {
  const s = input.trim().replace(/,/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function paiseToRupeesString(paise: number | null | undefined): string {
  if (paise == null) return "";
  const whole = Math.floor(paise / 100);
  const frac = paise % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0")}`;
}

export function discountPercent(price: number, compareAt: number | null | undefined): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) * 100) / compareAt);
}
