// Mobile layout check: screenshots + horizontal-overflow detection at phone widths.
// Usage: BASE=http://localhost:3100 ADMIN_EMAIL=.. ADMIN_PASSWORD=.. node scripts/mobile-check.mjs
import { chromium, devices } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = process.env.OUT ?? "mobile-shots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const sizes = { "iphone-se": devices["iPhone SE"], "pixel-7": devices["Pixel 7"] };
let problems = 0;

async function visit(page, name, path) {
  const res = await page.goto(BASE + path, { waitUntil: "networkidle" }).catch((e) => ({ status: () => 0, e }));
  await page.waitForTimeout(400);
  const over = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const bad = [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > w + 1 && getComputedStyle(el).position !== "fixed" && !el.closest("[class*=overflow-x-auto]"));
    return { scroll: document.documentElement.scrollWidth - w, offenders: bad.slice(0, 3).map((e) => e.tagName + "." + String(e.className).slice(0, 50)) };
  });
  const small = await page.evaluate(() => [...document.querySelectorAll("a,button,input,select")].filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.height && (r.height < 40 || r.width < 40) && getComputedStyle(el).visibility !== "hidden" && !el.classList.contains("sr-only") && r.width * r.height > 0 && !el.closest(".sr-only"); }).map((el) => el.tagName + ":" + (el.getAttribute("aria-label") || el.textContent.trim().slice(0, 20)) + " " + Math.round(el.getBoundingClientRect().width) + "x" + Math.round(el.getBoundingClientRect().height)));
  const flag = over.scroll > 0 ? "OVERFLOW" : "ok";
  if (over.scroll > 0) problems++;
  console.log(`${flag.padEnd(8)} ${name.padEnd(10)} ${path.padEnd(28)} status=${res.status()} small=${JSON.stringify(small)}${over.scroll > 0 ? " " + JSON.stringify(over) : ""}`);
  await page.screenshot({ path: `${OUT}/${name}-${path.replace(/[^a-z0-9]+/gi, "_") || "home"}.png`, fullPage: true });
}

for (const [name, device] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", page.url(), e.message.slice(0, 40)));
  const first = await (await ctx.request.get(BASE + "/api/products")).json().catch(() => ({ items: [] }));
  const slug = first.items?.find((i) => i.inStock)?.slug;
  for (const p of ["/", "/products", slug && `/products/${slug}`, "/cart", "/checkout", "/policies/shipping", "/account", "/admin/login"].filter(Boolean)) await visit(page, name, p);
  if (slug) {
    await page.goto(BASE + `/products/${slug}`);
    await page.getByRole("button", { name: "Add to cart" }).click();
    await visit(page, name, "/cart");
    await visit(page, name, "/checkout");
  }
  if (process.env.ADMIN_EMAIL) {
    await page.goto(BASE + "/admin/login");
    await page.fill("#email", process.env.ADMIN_EMAIL);
    await page.fill("#password", process.env.ADMIN_PASSWORD);
    await page.click("button:has-text('Sign in')");
    await page.waitForURL(/\/admin$/, { timeout: 15000 }).catch(() => console.log("LOGIN FAILED"));
    for (const p of ["/admin", "/admin/products", "/admin/products/new", "/admin/orders", "/admin/settings"]) await visit(page, name, p);
  }
  await ctx.close();
}
await browser.close();
console.log(problems ? `${problems} page(s) overflow` : "No horizontal overflow found");
