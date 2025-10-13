#!/usr/bin/env bash
set -e

echo "
==========================================
 Liora Quick Installer
==========================================
 Environment Setup:
   - Node.js v24 (via NVM)
   - PNPM + PM2
   - FFmpeg + SQLite + curl
   - liora-lib native bindings
==========================================
"

if [ -f /etc/debian_version ]; then
  OS_FAMILY="debian"
elif [ -f /etc/redhat-release ]; then
  OS_FAMILY="rhel"
else
  echo "Error: Unsupported OS (use Debian/Ubuntu or RHEL/CentOS)."
  exit 1
fi

echo "[INFO] Installing base system dependencies..."
if [ "$OS_FAMILY" = "debian" ]; then
  sudo apt update -y
  sudo apt install -y build-essential python3 ffmpeg curl git wget sqlite3 pkg-config unzip zip
else
  sudo yum groupinstall -y "Development Tools"
  sudo yum install -y epel-release
  sudo yum install -y python3 ffmpeg curl git wget sqlite pkgconfig unzip zip
fi

if [ ! -d "$HOME/.nvm" ]; then
  echo "[INFO] Installing NVM..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1090
. "$NVM_DIR/nvm.sh"

echo "[INFO] Installing Node.js v24..."
nvm install 24 >/dev/null
nvm use 24
nvm alias default 24

echo "[OK] Node.js $(node -v), npm $(npm -v)"

echo "[INFO] Setting up PNPM..."
corepack enable
corepack prepare pnpm@latest --activate
echo "[OK] PNPM $(pnpm -v)"

if ! command -v pm2 >/dev/null; then
  echo "[INFO] Installing PM2..."
  pnpm add -g pm2
fi
echo "[OK] PM2 $(pm2 -v)"

if [ ! -d "liora" ]; then
  echo "[INFO] Cloning Liora..."
  git clone https://github.com/naruyaizumi/liora.git
else
  echo "[OK] Liora directory found."
fi

cd liora

echo "[INFO] Installing dependencies..."
pnpm install --frozen-lockfile || pnpm install

if [ -d "node_modules/liora-lib" ]; then
  echo "[OK] liora-lib detected — prebuilt bindings handled automatically."
else
  echo "[WARN] liora-lib not installed; ensure it's listed in package.json."
fi

if pm2 list | grep -q "liora"; then
  pm2 restart liora
else
  pm2 start index.js --name "liora"
fi

pm2 save >/dev/null
pm2 startup -u "$(whoami)" --hp "$HOME" | tee pm2_startup.log
eval "$(grep 'sudo' pm2_startup.log | tail -1)" || true

echo "
==========================================
 Liora Installation Complete
==========================================
 Node.js     : $(node -v)
 PNPM        : $(pnpm -v)
 PM2         : $(pm2 -v)
 SQLite3     : $(sqlite3 --version | cut -d ' ' -f 1)
 CPU Arch    : $(uname -m)
 Platform    : $(uname -s)
 Directory   : $(pwd)

 PM2 Commands:
   pm2 logs liora
   pm2 restart liora
   pm2 stop liora
   pm2 delete liora

 Liora is now running under PM2.
==========================================
"