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

print_error() { echo "[ERROR] $1" >&2; }
print_success() { echo "[SUCCESS] $1"; }
print_info() { echo "[INFO] $1"; }
print_warning() { echo "[WARNING] $1"; }

if ! command -v curl &> /dev/null; then
    echo "[INFO] Installing curl..."
    apt-get update && apt-get install -y curl
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

print_banner() {
    clear
    cat << "EOF"
+------------------------------------------+
|                                          |
|          LIORA BOT INSTALLER             |
|                                          |
+------------------------------------------+

Repository: https://github.com/naruyaizumi/liora
License:    Apache 2.0
Author:     Naruya Izumi

EOF
}

main() {
    print_banner
    
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