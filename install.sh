#!/usr/bin/env bash
set -e

echo "
==========================================
 Liora Automated Installer
==========================================
  Environment Setup:
    - Node.js via NVM
    - Native addon toolchain (C++)
    - better-sqlite3, ffmpeg, curl, etc.
    - PM2 Process Manager
==========================================
"

if [ -f /etc/debian_version ]; then
  OS_FAMILY="debian"
elif [ -f /etc/redhat-release ]; then
  OS_FAMILY="rhel"
else
  echo "Error: Unsupported OS. Only Debian/Ubuntu and RHEL/CentOS supported."
  exit 1
fi

if [ "$OS_FAMILY" = "debian" ]; then
  echo "[INFO] Updating system packages..."
  sudo apt update -y
  sudo apt install -y \
    build-essential pkg-config cmake python3 python3-dev \
    ffmpeg imagemagick \
    libavformat-dev libavcodec-dev libavutil-dev \
    libswresample-dev libswscale-dev \
    libwebp-dev libpng-dev libjpeg-dev zlib1g-dev \
    libfreetype6-dev libharfbuzz-dev libpango1.0-dev \
    libgif-dev libopus-dev libvpx-dev \
    libcurl4-openssl-dev libnghttp2-dev libssl-dev \
    git curl wget zip unzip
elif [ "$OS_FAMILY" = "rhel" ]; then
  echo "[INFO] Installing dependencies for RHEL/CentOS..."
  sudo yum groupinstall -y "Development Tools"
  sudo yum install -y epel-release
  sudo yum install -y \
    cmake python3 python3-devel \
    ffmpeg ImageMagick \
    libwebp-devel libpng-devel libjpeg-turbo-devel \
    zlib-devel freetype-devel harfbuzz-devel pango-devel giflib-devel \
    opus-devel libvpx-devel \
    libcurl-devel nghttp2-devel openssl-devel \
    git curl wget zip unzip
fi

if [ ! -d "$HOME/.nvm" ]; then
  echo "[INFO] Installing NVM..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
else
  echo "[OK] NVM already installed."
fi

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1090
\. "$NVM_DIR/nvm.sh"

echo "[INFO] Installing Node.js v24..."
nvm install 24
nvm use 24
nvm alias default 24

echo "[OK] Node.js version: $(node -v)"
echo "[OK] npm version: $(npm -v)"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[INFO] Installing PM2 globally..."
  npm install -g pm2
else
  echo "[OK] PM2 detected: $(pm2 -v)"
fi

if [ ! -d "liora" ]; then
  echo "[INFO] Cloning Liora repository..."
  git clone https://github.com/naruyaizumi/liora.git
else
  echo "[OK] Liora directory detected."
fi

cd liora

if [ ! -f ".env" ]; then
  echo "[INFO] Creating .env from example..."
  cp .env.example .env
else
  echo "[OK] .env file exists."
fi

echo "[INFO] Installing dependencies..."
npm install

if [ -f "binding.gyp" ]; then
  echo "[INFO] Building native addons..."
  npm rebuild --build-from-source || echo "[WARN] Native build failed. Continuing..."
else
  echo "[WARN] binding.gyp not found, skipping native build."
fi

if pm2 list | grep -q "liora"; then
  echo "[INFO] Restarting existing Liora process..."
  pm2 restart liora
else
  echo "[INFO] Starting Liora..."
  pm2 start index.js --name "liora"
fi

pm2 save
pm2 startup -u "$(whoami)" --hp "$HOME" | tee pm2_startup.log
eval "$(grep 'sudo' pm2_startup.log | tail -1)" || true

echo "
==========================================
 Liora Installation Complete
==========================================
 Node.js     : $(node -v)
 npm          : $(npm -v)
 PM2 Version  : $(pm2 -v)
 N-API Level  : $(node -p "process.versions.napi")
 CPU Arch     : $(uname -m)
 Platform     : $(uname -s)
 Working Dir  : $(pwd)

 PM2 Commands:
   pm2 list
   pm2 logs liora
   pm2 restart liora
   pm2 stop liora
   pm2 delete liora

 Installed Native Modules:
   - cron
   - sticker
   - converter
   - fetch

 Optimized for:
   - Node.js 24.x (official via NVM)
   - libcurl + ffmpeg + sqlite3 + Node-API

 Liora is now running under PM2 supervision.
==========================================
"