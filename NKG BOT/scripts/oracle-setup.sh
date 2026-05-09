#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

install_node() {
    local major
    if command -v node >/dev/null 2>&1; then
        major="$(node -p "process.versions.node.split('.')[0]")"
    else
        major=0
    fi

    if [ "$major" -ge 20 ]; then
        return
    fi

    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg build-essential
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
}

install_pm2_startup() {
    if command -v systemctl >/dev/null 2>&1; then
        sudo env PATH="$PATH" pm2 startup systemd -u "$USER" --hp "$HOME" || true
    fi
}

cd "$APP_DIR"
mkdir -p logs

install_node

node --version
npm --version

npm ci --omit=dev
sudo npm install -g pm2

pm2 startOrReload ecosystem.config.cjs
pm2 save
install_pm2_startup
pm2 save

pm2 status nkg-bot
