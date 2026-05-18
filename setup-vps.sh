#!/bin/bash
# PulseBooster VPS setup — run once on Hostinger VPS
set -e

echo "==> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "==> Installing PM2..."
npm install -g pm2

echo "==> Installing dependencies..."
npm ci

echo "==> Installing Playwright Chromium..."
npx playwright install chromium --with-deps

echo "==> Setup done."
echo ""
echo "Next:"
echo "  1. cp .env.example .env && nano .env   (fill in your keys)"
echo "  2. pm2 start ecosystem.config.cjs"
echo "  3. pm2 save && pm2 startup"
