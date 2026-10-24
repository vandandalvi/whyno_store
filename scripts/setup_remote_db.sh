#!/usr/bin/env bash
set -e

# Generate a strong password for whynostore DB user
DB_PASS=$(head -c 24 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 20)

sudo -u postgres psql -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'whynostore') THEN CREATE ROLE whynostore WITH LOGIN PASSWORD '$DB_PASS'; ELSE ALTER ROLE whynostore WITH PASSWORD '$DB_PASS'; END IF; END \$\$;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'whynostore'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE whynostore OWNER whynostore;"

sudo -u postgres psql -d whynostore -c "GRANT ALL ON SCHEMA public TO whynostore;"

# Create secure configuration directory
sudo mkdir -p /etc/whynostore
cat <<EOF | sudo tee /etc/whynostore/.env > /dev/null
DATABASE_URL="postgresql://whynostore:$DB_PASS@127.0.0.1:5432/whynostore"
APP_URL="https://store.whyno.tech"
PORT="4100"
NODE_ENV="production"
ALLOW_LOCAL_UPLOADS="1"
EOF

sudo chmod 600 /etc/whynostore/.env
echo "PostgreSQL setup complete. Database URL configured."
