# Whyno Store

Modern, secure, and resilient e-commerce application for Whyno, deployed on Azure App Service at [store.whyno.tech](https://store.whyno.tech).

Built with **Next.js 15.5**, **React 19**, **Prisma ORM**, and **PostgreSQL 17**.

---

## Architecture & Features

### Storefront
- **Modern Design**: Clean typography (DM Sans & Space Grotesk), responsive mobile-first UI with Tailwind CSS.
- **Catalogue & Search**: Categorized products, instant search, price and name filters.
- **Product Details**: Multi-image galleries, specification tables, real-time stock indicators.
- **Cart & Checkout**: Client cart synced with server quote API; checkout with atomic stock allocation and strict idempotency protection.
- **Secure Order View**: Tokenized customer order status (`/order/[reference]?t=...`) with SHA-256 hashed secret tokens.

### Admin Backoffice (`/admin`)
- **Authentication**: High-security Argon2id password hashing, database-backed session tokens, HttpOnly Strict cookies, and brute-force lockout.
- **Product Catalog Management**: Create, edit, and archive products; multi-image upload with client and server validation.
- **Order Fulfillment**: Track and manage order lifecycles (`PENDING` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED` / `CANCELLED`), with tracking numbers and automatic inventory restock upon cancellation.
- **Store Settings**: Customize store name, announcement banner, contact info, shipping rules, and free delivery thresholds.

### Reliability & Financial Safety
- **Integer Paise Representation**: All currency amounts stored and computed in integer paise (`1 INR = 100 paise`). Zero floating-point rounding errors.
- **Oversell Prevention**: PostgreSQL serializable updates with `CHECK (stock >= 0)` database-level constraints.
- **Azure Cloud Native**: Standalone Next.js container output; images stored in Azure Blob Storage with System-Assigned Managed Identity (`Storage Blob Data Contributor`) without hardcoded credentials.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 15.5](https://nextjs.org/) (App Router, Standalone Output) |
| **UI & Styling** | [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Database & ORM** | [PostgreSQL 17](https://www.postgresql.org/), [Prisma 6](https://www.prisma.io/) |
| **Cloud Infrastructure** | [Azure App Service](https://azure.microsoft.com/en-us/products/app-service/), [Azure Blob Storage](https://azure.microsoft.com/en-us/products/storage/blobs/) |
| **Security & Auth** | [@node-rs/argon2](https://github.com/napi-rs/node-rs), CSP headers, Managed Identity |
| **Testing** | [Vitest](https://vitest.dev/) with real PostgreSQL test suites |

---

## Local Development Setup

### 1. Prerequisites
- Node.js >= 20.0.0
- Docker & Docker Compose (for local PostgreSQL)

### 2. Start PostgreSQL
```bash
# Starts Postgres 17 on localhost:54329
npm run db:local
```
*(The local DB runs on port 54329 to avoid conflicts with default PostgreSQL instances).*

### 3. Setup Database Schema & Seed Data
```bash
# Run migrations
npm run db:deploy

# Seed demo products (Home & Bags categories)
npm run db:seed
```

### 4. Create Local Admin Account
```bash
ADMIN_EMAIL="admin@whyno.tech" npm run admin:create
# Prompts securely for password (min 12 characters, letters + numbers)
```

### 5. Launch Development Server
```bash
# If port 3000 is occupied on your host, use port 3100:
npm run dev -- -p 3100
```
Visit `http://localhost:3100` to view the storefront, or `http://localhost:3100/admin` for the admin portal.

---

## Testing & Quality Assurance

```bash
# Run 25-test suite against real PostgreSQL container
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Production standalone build
npm run build
```

---

## Project Structure

```
whynostore/
├── prisma/                 # Prisma schema, migrations, and seed scripts
├── public/                 # Static brand assets and local upload fallback
├── scripts/                # Administrative utilities (create-admin, etc.)
├── src/
│   ├── app/
│   │   ├── (shop)/         # Public storefront pages (catalogue, cart, checkout, orders)
│   │   ├── admin/          # Backoffice portal (dashboard, products, orders, settings)
│   │   └── api/            # REST and server action API endpoints
│   ├── components/         # Shared storefront & admin UI components
│   └── lib/                # Core business logic (auth, cart, orders, money, storage, audit)
├── tests/                  # Integration tests (orders, inventory, products)
├── DEPLOYMENT.md           # Production Azure deployment guide
└── SECURITY.md             # Security architecture and vulnerability disclosure
```

---

## Deployment & Production

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on configuring Azure App Service, Azure PostgreSQL, Azure Blob Storage Managed Identity, and DNS routing via `orderbox-dns.com`.

See [SECURITY.md](SECURITY.md) for architectural details on money handling, concurrency safety, and authentication.
