#!/usr/bin/env bash
set -e

cd /opt/whynostore

cat << 'EOF' > /tmp/create_admin.js
const { PrismaClient } = require('@prisma/client');
const { hash } = require('@node-rs/argon2');

const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD');

  const db = new PrismaClient();
  try {
    const passwordHash = await hash(password, ARGON);
    const user = await db.adminUser.upsert({
      where: { email },
      create: { email, passwordHash, role: 'OWNER' },
      update: { passwordHash, active: true },
    });
    console.log('SUCCESS: Admin user created: ' + user.email);
  } finally {
    await db.$disconnect();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
EOF

sudo mv /tmp/create_admin.js /opt/whynostore/create_admin.js

DATABASE_URL=$(sudo grep DATABASE_URL /etc/whynostore/.env | cut -d '=' -f2- | tr -d '"')

echo "=== 1. Creating admin user ==="
sudo DATABASE_URL="$DATABASE_URL" ADMIN_EMAIL="admin@whyno.tech" ADMIN_PASSWORD="WhynoStoreAdmin2026!" node /opt/whynostore/create_admin.js

echo "=== 2. Setting permissions ==="
sudo mkdir -p /opt/whynostore/public/uploads
sudo chown -R www-data:www-data /opt/whynostore
sudo chmod -R 755 /opt/whynostore

echo "=== 3. Setting up systemd service ==="
cat <<'EOF' | sudo tee /etc/systemd/system/whyno-store.service > /dev/null
[Unit]
Description=Whyno Store Next.js Standalone Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/whynostore
EnvironmentFile=/etc/whynostore/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=whyno-store
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable whyno-store
sudo systemctl restart whyno-store

echo "=== 4. Checking systemd status ==="
sleep 4
sudo systemctl status whyno-store --no-pager

echo "=== 5. Health Check ==="
curl -i http://127.0.0.1:4100/api/health
echo ""

echo "=== 6. Setting up Nginx ==="
cat <<'EOF' | sudo tee /etc/nginx/sites-available/store.whyno.tech > /dev/null
server {
    server_name store.whyno.tech;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:4100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    listen 80;
}
EOF

sudo ln -sf /etc/nginx/sites-available/store.whyno.tech /etc/nginx/sites-enabled/store.whyno.tech
sudo nginx -t
sudo systemctl reload nginx

echo "=== Setup script completed successfully! ==="
