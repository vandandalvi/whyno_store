# Whyno Store — Deployment Guide

This guide details the production deployment architecture and step-by-step procedures for hosting Whyno Store on **Azure App Service** at **https://store.whyno.tech**.

---

## 1. Architecture Overview

```
                      [ orderbox-dns.com ]
                     CNAME: store.whyno.tech
                               |
                               v
               +-------------------------------+
               |    Azure App Service (Linux)   |
               |       Node.js 20 LTS           |
               |   Next.js Standalone Server   |
               +---------------+---------------+
                               |
        +----------------------+----------------------+
        |                                             |
        v                                             v
+-------------------------------+             +-------------------------------+
|  Azure Database for PostgreSQL |             |      Azure Blob Storage       |
|    Flexible Server (TLS req)  |             | Container: `product-images`   |
|   Private/Firewalled Access   |             |   Role: Data Contributor      |
+-------------------------------+             +-------------------------------+
```

- **Runtime**: Next.js 15 standalone server (`node server.js`) running on Node.js 20 LTS in an Azure App Service Linux container.
- **Database**: Azure Database for PostgreSQL Flexible Server with TLS (`sslmode=require`).
- **Media Storage**: Azure Blob Storage container `product-images` configured with public blob read access. The web app authenticates via Azure System-Assigned Managed Identity (`Storage Blob Data Contributor`). No storage keys are stored in code or configuration.
- **Secrets Management**: Sensitive settings (`DATABASE_URL`) stored in Azure Key Vault and referenced via App Service Key Vault references (`@Microsoft.KeyVault(...)`).
- **Custom Domain & SSL**: `store.whyno.tech` verified via DNS CNAME & TXT records at `orderbox-dns.com`, secured with an Azure App Service Managed Certificate (free auto-renewing TLS).

---

## 2. Pre-Requisites & Cost Approval Policy

> [!IMPORTANT]
> **Strict Cost Approval**: Always review existing Azure resources (`az group list`, `az appservice plan list`, etc.) to reuse existing App Service Plans or PostgreSQL instances. Explicit approval must be obtained from project stakeholders prior to provisioning new billable resources.

---

## 3. Azure Infrastructure Setup

### Step 3.1: Resource Group & App Service Plan
Reuse an existing Resource Group and Linux App Service Plan (e.g. `B1` or `P1v3`), or provision:
```bash
az group create --name rg-whyno --location centralindia

az appservice plan create \
  --name plan-whyno-store \
  --resource-group rg-whyno \
  --is-linux \
  --sku B1
```

### Step 3.2: Storage Account & Container
Create the blob storage account for product images:
```bash
# Storage account name must be globally unique (lowercase alphanumeric, 3-24 chars)
az storage account create \
  --name stwhynostoreprod \
  --resource-group rg-whyno \
  --location centralindia \
  --sku Standard_LRS \
  --allow-blob-public-access true

# Create product-images container with blob-level public read
az storage container create \
  --account-name stwhynostoreprod \
  --name product-images \
  --public-access blob \
  --auth-mode login
```

### Step 3.3: Azure App Service Web App
Create the web app running Node 20:
```bash
az webapp create \
  --name app-whynostore \
  --resource-group rg-whyno \
  --plan plan-whyno-store \
  --runtime "NODE:20-lts"

# Enable System-Assigned Managed Identity
az webapp identity assign \
  --name app-whynostore \
  --resource-group rg-whyno
```
*Note the returned `principalId` from the identity assignment command.*

### Step 3.4: Assign Storage Permissions
Grant the App Service Managed Identity permissions to write blobs:
```bash
STORAGE_ID=$(az storage account show --name stwhynostoreprod --resource-group rg-whyno --query id -o tsv)
APP_PRINCIPAL_ID=$(az webapp identity show --name app-whynostore --resource-group rg-whyno --query principalId -o tsv)

az role assignment create \
  --assignee $APP_PRINCIPAL_ID \
  --role "Storage Blob Data Contributor" \
  --scope $STORAGE_ID
```

### Step 3.5: PostgreSQL Network Security
Restrict PostgreSQL Flexible Server firewall rules to the App Service outbound IP addresses:
```bash
OUTBOUND_IPS=$(az webapp show --name app-whynostore --resource-group rg-whyno --query outboundIpAddresses -o tsv)

# Add firewall rule for each IP or subnet
for ip in $(echo $OUTBOUND_IPS | tr "," " "); do
  az postgres flexible-server firewall-rule create \
    --resource-group rg-whyno \
    --name psql-whyno \
    --rule-name "appservice-$ip" \
    --start-ip-address $ip \
    --end-ip-address $ip
done
```

---

## 4. App Configuration & Environment Variables

Configure application settings in Azure App Service:

| Variable | Value / Format | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | `@Microsoft.KeyVault(SecretUri=...)` or `postgresql://user:pass@host:5432/whyno?sslmode=require` | PostgreSQL connection string |
| `APP_URL` | `https://store.whyno.tech` | Public base URL for canonical tags, sitemap, and CORS |
| `AZURE_STORAGE_ACCOUNT_NAME` | `stwhynostoreprod` | Enables Azure Blob Storage provider |
| `AZURE_STORAGE_CONTAINER_NAME` | `product-images` | Blob container name |
| `NODE_ENV` | `production` | Enforces production mode and security guards |
| `PORT` | `8080` | Port App Service routes HTTP traffic to |

Configure settings via CLI:
```bash
az webapp config appsettings set \
  --name app-whynostore \
  --resource-group rg-whyno \
  --settings \
    APP_URL="https://store.whyno.tech" \
    AZURE_STORAGE_ACCOUNT_NAME="stwhynostoreprod" \
    AZURE_STORAGE_CONTAINER_NAME="product-images" \
    NODE_ENV="production" \
    PORT="8080"
```

Configure custom startup command:
```bash
az webapp config set \
  --name app-whynostore \
  --resource-group rg-whyno \
  --startup-file "node server.js"
```

---

## 5. Custom Domain & DNS Setup

Whyno's DNS is managed at `orderbox-dns.com` (registrar nameservers).

1. In Azure App Service:
   - Navigate to **Custom domains** → **Add custom domain**.
   - Enter `store.whyno.tech`.
   - Azure displays the verification ID (`asuid.store`) and target (`app-whynostore.azurewebsites.net`).

2. In DNS Management (`orderbox-dns.com`):
   - Add TXT Record:
     - **Host**: `asuid.store`
     - **Value**: `<Azure verification ID>`
   - Add CNAME Record:
     - **Host**: `store`
     - **Value**: `app-whynostore.azurewebsites.net`
   - *Ensure existing MX, SPF, or apex A records are left untouched.*

3. Validate & Bind SSL:
   - Click **Validate** in Azure App Service once DNS propagates.
   - Click **Add binding** → select **App Service Managed Certificate** (free, automatically renewed).
   - Under **Custom domains**, toggle **HTTPS Only** to `On`.

---

## 6. Build & Packaging for Standalone Deployment

Next.js is configured with `output: "standalone"`. The build produces a minimal distribution directory:

```bash
# 1. Clean and install dependencies
npm ci

# 2. Build standalone bundle
npm run build

# 3. Assemble deployment package
mkdir -p deploy_pkg
cp -r .next/standalone/* deploy_pkg/
mkdir -p deploy_pkg/.next/static
cp -r .next/static deploy_pkg/.next/
cp -r public deploy_pkg/

# 4. Create ZIP package
cd deploy_pkg && zip -r ../release.zip . && cd ..
```

---

## 7. Database Migrations

> [!CAUTION]
> Never run `prisma migrate reset` or `db push --force-reset` on a production database.

Run database migrations during the CI/CD pipeline **before** promoting the new release:
```bash
DATABASE_URL="$PROD_DATABASE_URL" npx prisma migrate deploy
```

---

## 8. Initial Admin Account Creation

Once deployed and connected to the production database:
```bash
ADMIN_EMAIL="admin@whyno.tech" ADMIN_PASSWORD="<STRONG_PASSWORD>" npx tsx scripts/create-admin.ts
```

---

## 9. Post-Deployment Verification Checklist

- [ ] `GET https://store.whyno.tech/api/health` returns `{"status":"ok","db":"connected"}`.
- [ ] Storefront catalogue renders seeded/published products.
- [ ] Product detail page loads with gallery and specifications.
- [ ] Add to cart, adjust quantity, and cart quote updates accurately.
- [ ] Checkout completes with demo mock payment and returns secret order URL.
- [ ] `/order/[ref]?t=[token]` loads order details and prevents unauthorized access.
- [ ] Accessing `/admin` redirects unauthenticated users to `/admin/login`.
- [ ] Admin login succeeds, displaying dashboard, order list, and product management.
- [ ] Creating/editing a product with an uploaded image successfully stores to Azure Blob Storage.
- [ ] Order status updates smoothly (e.g. `PENDING` -> `PROCESSING` -> `SHIPPED`).
