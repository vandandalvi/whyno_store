# Security Policy

Whyno Store is built with defense-in-depth principles for e-commerce security, financial data integrity, and administrative access protection.

## Core Security Architecture

### 1. Financial Integrity & Money Representation
- **Integer Paise Representation**: All monetary values (product prices, subtotal, shipping, discounts, and order totals) are strictly modeled and stored as integer paise (`1 INR = 100 paise`). Floating-point arithmetic is never used for currency calculations.
- **Authoritative Server-Side Pricing**: The storefront client sends only product IDs and requested quantities. Prices, compare-at amounts, and tax/shipping logic are resolved directly from PostgreSQL at transaction time. Client-submitted prices are rejected.
- **Database-Level Integrity Constraints**: PostgreSQL `CHECK` constraints enforce `price >= 0` and `stock >= 0`. Negative prices, invalid discounts, or negative inventory values cannot be committed to the database even in the event of an application logic bug.

### 2. Concurrency & Oversell Protection
- **Atomic Inventory Updates**: Checkout transactions execute within a single PostgreSQL serializable transaction using conditional decrements:
  ```sql
  UPDATE "Product" SET stock = stock - qty WHERE id = $id AND stock >= qty
  ```
- **Strict Idempotency**: Every checkout request requires a unique idempotency key. Duplicate submissions (e.g. double clicks or network retries) return the existing order without duplicate charges or stock decrement.
- **Audit Logging**: Every inventory movement (creation, checkout deduction, cancellation restock, and manual adjustment) is recorded in the `InventoryMovement` ledger.

### 3. Customer Data & Order Privacy
- **Tokenized Access URLs**: Orders are accessed via `/order/{reference}?t={secretToken}`. The secret token is generated cryptographically using `crypto.randomBytes` and stored as a SHA-256 hash in the database.
- **No Unauthenticated Enumeration**: Order references cannot be scraped or enumerated without the valid secret access token.
- **Customer Privacy**: The store collects only essential shipping and contact details (name, email, phone, shipping address). Payment card details are never received or stored on Whyno servers.

### 4. Admin Authentication & Session Management
- **Password Hashing**: Passwords are hashed using **Argon2id** with high-memory parameters (`@node-rs/argon2`).
- **Session Tokens**: Sessions are tracked via high-entropy tokens. Only the SHA-256 digest of the session token is persisted in PostgreSQL.
- **Cookie Security**: Authentication cookies are marked `HttpOnly`, `SameSite=Strict`, and `Secure` (in production).
- **Two-Layer Access Control**:
  1. `middleware.ts`: Edge/middleware redirect gate protecting `/admin` routes.
  2. `requireAdmin()` & `getAdmin()`: Mandatory server-side authorization check guarding every admin Server Action and API endpoint (`/api/admin/*`).
- **Brute-Force Lockout & Rate Limiting**: Exponential backoff and database-backed rate limiting on login attempts to mitigate credential stuffing.

### 5. Media & Upload Security
- **File Signature Sniffing**: Client-supplied `Content-Type` headers are untrusted. File signatures (magic bytes) are inspected to guarantee that uploads are valid JPEG, PNG, or WebP files.
- **Dimension and Size Enforcement**: Uploads are restricted to 5 MB max size, and image dimensions are validated (between 200×200 and 8000×8000 pixels).
- **Azure Managed Identity**: Blob storage access uses Azure Managed Identity (`DefaultAzureCredential` with `Storage Blob Data Contributor`). No storage access keys or connection strings are kept in environment variables or code.
- **Isolated Object Names**: Uploaded filenames are converted to timestamped UUID keys (`products/{year}/{uuid}.{ext}`), preventing path traversal and name collisions.

### 6. Content Security Policy & HTTP Headers
- **Content-Security-Policy**: Enforces strict origin restrictions, allowing images exclusively from self and `https://<storage-account>.blob.core.windows.net`.
- **Hardening Headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.

## Reporting a Vulnerability

If you discover a security vulnerability in Whyno Store:
1. Please report it privately by emailing **security@whyno.tech** (or **privacy@whyno.tech**).
2. Do not disclose the issue publicly until a fix has been released.
3. Please include reproduction steps, environment details, and proof-of-concept payloads where applicable. We commit to acknowledging reports within 48 hours.
