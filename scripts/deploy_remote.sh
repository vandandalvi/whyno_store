#!/usr/bin/env bash
set -e

cd /opt/whynostore
DATABASE_URL=$(sudo grep DATABASE_URL /etc/whynostore/.env | cut -d '=' -f2- | tr -d '"')

echo "=== 4. Creating initial admin user ==="
DATABASE_URL="$DATABASE_URL" ADMIN_EMAIL="admin@whyno.tech" ADMIN_PASSWORD="WhynoStoreAdmin2026!" npx tsx@4.23.15 scripts/create-admin.ts

echo "=== 5. Setting up systemd service ==="
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

echo "=== 6. Verifying service status ==="
sleep 4
sudo systemctl status whyno-store --no-pager
curl -i http://127.0.0.1:4100/api/health
echo ""

echo "=== 7. Setting up Nginx for store.whyno.tech ==="
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

echo "=== Deployment to VM completed successfully! ==="
