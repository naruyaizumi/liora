#!/bin/bash
# Liora Bot Installer - FIXED VERSION
# All bugs patched, production ready

set -euo pipefail

GITHUB_RAW="https://raw.githubusercontent.com/naruyaizumi/liora/main/src/lib/shell"

# Export all global variables
export SERVICE_NAME="liora"
export SYSTEMD_SERVICE="/etc/systemd/system/liora.service"
export PM2_ECOSYSTEM="/root/liora/ecosystem.config.js"
export HELPER_FILE="/usr/local/bin/bot"
export WORK_DIR="/root/liora"
export BUN_PATH="/root/.bun/bin/bun"
export REPO_URL="https://github.com/naruyaizumi/liora.git"
export BACKUP_DIR="/root/liora_backups"
export PROCESS_MANAGER=""

# Logging functions
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }
error() { echo "[ERROR] $1" >&2; }
info() { echo "[INFO] $1"; }
warn() { echo "[WARN] $1"; }

# Export logging functions
export -f log error info warn

check_curl() {
    if ! command -v curl &> /dev/null; then
        info "Installing curl..."
        if command -v apt-get &> /dev/null; then
            apt-get update -qq && apt-get install -y curl
        elif command -v yum &> /dev/null; then
            yum install -y curl
        elif command -v dnf &> /dev/null; then
            dnf install -y curl
        else
            error "Cannot install curl. Please install manually."
            exit 1
        fi
    fi
}

load_script() {
    local script="$1"
    local url="${GITHUB_RAW}/${script}"
    local temp="/tmp/liora_${script}"
    
    info "Loading ${script}..."
    curl -sSf "$url" -o "$temp" || {
        error "Failed to download ${script}"
        exit 1
    }
    
    # Source and verify
    source "$temp" || {
        error "Failed to source ${script}"
        rm -f "$temp"
        exit 1
    }
    rm -f "$temp"
}

cleanup() {
    error "Installation failed. Cleaning up..."
    
    if [ "${PROCESS_MANAGER:-}" = "systemd" ]; then
        systemctl stop "$SERVICE_NAME" 2>/dev/null || true
        systemctl disable "$SERVICE_NAME" 2>/dev/null || true
        rm -f "$SYSTEMD_SERVICE"
        systemctl daemon-reload 2>/dev/null || true
    elif [ "${PROCESS_MANAGER:-}" = "pm2" ]; then
        command -v pm2 &>/dev/null && pm2 delete liora 2>/dev/null || true
        rm -f "$PM2_ECOSYSTEM"
    fi
    
    rm -f "$HELPER_FILE"
    exit 1
}

trap cleanup ERR INT TERM

show_completion() {
    local current=$(cat "$WORK_DIR/.current_version" 2>/dev/null || echo "unknown")
    local bun_ver=$("$BUN_PATH" --version 2>/dev/null || echo "unknown")
    
    cat << EOF

================================================================================
                        Installation Complete
================================================================================

System Information:
  OS:              ${OS_ID:-unknown} ${OS_VERSION:-unknown}
  Process Manager: $PROCESS_MANAGER
  Liora Version:   $current
  Bun Runtime:     v$bun_ver

Installation Paths:
  Directory: $WORK_DIR
  Config:    $WORK_DIR/.env
  Logs:      $WORK_DIR/logs/
  CLI:       /usr/local/bin/bot

Quick Start:
  bot start    - Start the bot
  bot log      - View live logs
  bot status   - Check status
  bot          - Show all commands

Documentation:
  https://github.com/naruyaizumi/liora

================================================================================

EOF
}

main() {
    clear
    cat << "EOF"
================================================================================
                           LIORA BOT INSTALLER
================================================================================

Repository: https://github.com/naruyaizumi/liora
License:    Apache 2.0
Author:     Naruya Izumi

EOF
    
    check_curl
    
    load_script "deps.sh"
    load_script "version.sh"
    load_script "config.sh"
    load_script "service.sh"
    load_script "systemd.sh"
    load_script "pm2.sh"
    
    install_dependencies
    select_process_manager
    select_version
    configure_bot
    clone_and_install
    create_service
    create_cli
    show_completion
}

main "$@"