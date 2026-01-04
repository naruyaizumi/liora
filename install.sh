#!/bin/bash

set -euo pipefail

GITHUB_RAW="https://raw.githubusercontent.com/naruyaizumi/liora/main/src/lib/shell"
SERVICE_NAME="liora"
SERVICE_FILE="/etc/systemd/system/liora.service"
HELPER_FILE="/usr/local/bin/bot"
WORK_DIR="/root/liora"
BUN_PATH="/root/.bun/bin/bun"
REPO_URL="https://github.com/naruyaizumi/liora.git"
TIME_ZONE="Asia/Jakarta"
DB_NAME="liora"
DB_USER="liora"
DB_PASSWORD="naruyaizumi"
DB_HOST="localhost"
DB_PORT="5432"
REDIS_HOST="localhost"
REDIS_PORT="6379"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_info() { echo -e "[INFO] $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

if ! command -v curl &> /dev/null; then
    echo "[INFO] Installing curl..."
    if command -v apt-get &> /dev/null; then
        apt-get update && apt-get install -y curl
    elif command -v dnf &> /dev/null; then
        dnf install -y curl
    elif command -v pacman &> /dev/null; then
        pacman -Sy --noconfirm curl
    else
        print_error "Cannot install curl automatically"
        exit 1
    fi
fi

load_script() {
    local script="$1"
    local url="${GITHUB_RAW}/${script}"
    local temp="/tmp/${script}"
    
    print_info "Loading ${script}..."
    curl -sSf "$url" -o "$temp" || {
        print_error "Failed to download ${script}"
        exit 1
    }
    source "$temp"
    rm -f "$temp"
}

cleanup_on_error() {
    print_error "Installation failed. Cleaning up..."
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    rm -f "$SERVICE_FILE" "$HELPER_FILE"
    systemctl daemon-reload 2>/dev/null || true
    exit 1
}

trap cleanup_on_error ERR

main() {
    print_info "Starting Liora Bot installation..."
    echo ""
    
    load_script "deps.sh"
    load_script "setup.sh"
    load_script "service.sh"
    load_script "cli.sh"
    install_dependencies
    setup_environment
    create_service
    create_cli
    print_completion
}

main "$@"