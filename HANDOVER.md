# Whyno Store: handover to the deploy agent

Target: **https://store.whyno.tech** on Azure App Service. Domain DNS is at `orderbox-dns.com` (registrar-hosted nameservers).

## State: code built locally, nothing deployed

Verified:
- `npx tsc --noEmit` clean; `next lint` clean; `npm run build` succeeds (Next 15.5, standalone output).
- `npm test`: 25/25 passing against real Postgres (checkout, idempotency, concurrent overselling, order status flow, restock, product CRUD/visibility, image validation, money, DB CHECK constraints).

NOT verified / not done:
- **Live smoke test** of the running server (public pages, `/api/checkout`, admin gate) was started on port 3100 but its result was never read. Re-run it. Note port 3000 on the dev machine is used by an unrelated app.
- **No browser/UI test** of the admin (login, product form, image uploader, order status). Login and server actions were never exercised end to end. Test these first.
- **No admin user exists.** Create with `ADMIN_EMAIL=... npm run admin:create` (prompts for a password; never commit it).
- Not written yet: `README.md`, `DEPLOYMENT.md`, `SECURITY.md`, GitHub Actions workflow, Playwright e2e, email notifications (none: the site works without email), `/admin` UI polish.
- No Azure resources created, no DNS changed, no git commit made (repo is `git init` only).

## Local dev
```
docker compose up -d          # Postgres 17 on :54329 (DB whyno, and whyno_test created manually)
npx prisma migrate deploy
npx tsx prisma/seed.ts        # demo products, refuses production DBs
npm run dev
```
`.env` (gitignored) holds local-only credentials. `.env.example` lists the variables.
If `whyno_test` is missing: `docker compose exec db psql -U whyno -c "create database whyno_test"`.

## Production settings the app expects
`DATABASE_URL` (TLS, `sslmode=require`), `APP_URL=https://store.whyno.tech`, `AZURE_STORAGE_ACCOUNT_NAME`, `AZURE_STORAGE_CONTAINER_NAME` (default `product-images`; container must allow public blob read; the app's managed identity needs *Storage Blob Data Contributor*). No storage keys are used (`DefaultAzureCredential`). In production the app refuses to store images if the account name is unset.
Start command: `node .next/standalone/server.js`; deploy `.next/standalone` plus `.next/static` and `public`. Run `npx prisma migrate deploy` before switching traffic (needs the prisma CLI and `prisma/` folder, so run it in CI, not the slim runtime). Health check: `/api/health`.

## Architecture notes
- Money is integer paise. Prices and stock are always read from the DB at checkout; the browser sends only product ids and quantities.
- `placeOrder` (`src/lib/orders.ts`): single transaction, conditional `UPDATE ... stock >= qty`, unique `idempotencyKey`. Orders are viewable by customers only with a secret token (`/order/REF?t=...`, stored hashed).
- Payment is demo only: `MOCK_DEMO` / `MOCK_CONFIRMED`; `VERIFIED` is never set by any code path. Replace in `placeOrder` when a real gateway is added.
- Auth: argon2id, sha256-hashed session tokens in DB, httpOnly + SameSite=strict cookie, login lockout, DB-backed rate limits. `middleware.ts` is only a first gate; `requireAdmin()` guards every admin page/action, `getAdmin()` guards `/api/admin/uploads`.
- Storefront is under `src/app/(shop)`, admin under `src/app/admin`.
- CSP in `next.config.ts` allows images from `https://<account>.blob.core.windows.net` only.
- `public/brand/*.svg` are placeholders; no official Whyno logo was available. `social.svg` is not accepted by some link scrapers, so swap in a PNG.

## Deploy checklist
1. `az login`; reuse existing resource group, App Service plan, PostgreSQL, storage if compatible. **Get cost approval before creating anything billable.**
2. Back up any existing DB before migrating; never reset.
3. Restrict the PostgreSQL firewall to the web app's outbound IPs, or use private networking.
4. App settings (Key Vault references for `DATABASE_URL`); system-assigned identity with blob role.
5. Add custom domain `store.whyno.tech`: use the CNAME and `asuid.store` TXT values Azure returns; add them at the DNS host (`orderbox-dns.com` panel). Preserve existing records (MX/SPF etc.). Then bind a managed certificate and enable HTTPS-only.
6. Create the admin, then smoke test: catalogue, cart, demo checkout, admin login, product create with image upload, order appears and status change, restart and confirm persistence.
7. Write the missing docs and CI workflow (OIDC federation, no long-lived secrets).
