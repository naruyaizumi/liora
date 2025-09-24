#!/usr/bin/env bash

set -euo pipefail

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
  echo -e "${CYAN}[INFO]${NC} $*"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $*"
}

error() {
  echo -e "${RED}[ERROR]${NC} $*" >&2
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $*"
}

# Detect platform
log "Detecting platform..."
case "$(uname -s)" in
  Linux*)
    if command -v apt &>/dev/null; then
      log "Detected Debian/Ubuntu-based system."
      sudo apt update -y && sudo apt upgrade -y
      sudo apt install -y git curl wget ffmpeg imagemagick nano
    elif command -v dnf &>/dev/null; then
      log "Detected Fedora/RHEL-based system."
      sudo dnf upgrade -y
      sudo dnf install -y git curl wget ffmpeg ImageMagick nano
    elif command -v pacman &>/dev/null; then
      log "Detected Arch-based system."
      sudo pacman -Syu --noconfirm
      sudo pacman -S --noconfirm git curl wget ffmpeg imagemagick nano
    elif command -v zypper &>/dev/null; then
      log "Detected openSUSE system."
      sudo zypper refresh
      sudo zypper install -y git curl wget ffmpeg ImageMagick nano
    else
      error "Unsupported Linux distribution. Please install dependencies manually."
      exit 1
    fi
    ;;
  Darwin*)
    if ! command -v brew &>/dev/null; then
      warn "Homebrew not found. Installing..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    log "Installing dependencies via Homebrew..."
    brew install git curl wget ffmpeg imagemagick nano
    ;;
  *)
    error "Unsupported operating system: $(uname -s)"
    exit 1
    ;;
esac

# Install nvm
log "Installing nvm..."
NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

# Load nvm
export NVM_DIR
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install and use Node.js v24
log "Installing Node.js v24..."
nvm install 24
nvm use 24

# Clone and setup project
log "Cloning Liora repository..."
git clone https://github.com/naruyaizumi/liora
cd liora

log "Installing npm dependencies..."
npm install

echo
success "Installation completed successfully! 🎉"
echo -e "${BLUE}To start the bot, run:${NC} ${GREEN}npm start${NC}"
echo -e "${YELLOW}Don’t forget to edit the config file before running yaw! :D${NC}"
