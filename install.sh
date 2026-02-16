#!/bin/bash
# Liora Bot Installer - Production Ready

set -euo pipefail

GITHUB_RAW="https://raw.githubusercontent.com/naruyaizumi/liora/main/src/lib/shell"

export SERVICE_NAME="liora"
export SYSTEMD_SERVICE="/etc/systemd/system/liora.service"
export HELPER_FILE="/usr/local/bin/bot"
export WORK_DIR="/root/liora"
export BUN_PATH="/root/.bun/bin/bun"
export REPO_URL="https://github.com/naruyaizumi/liora.git"
export BACKUP_DIR="/root/liora_backups"

export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[0;33m'
export BLUE='\033[0;34m'
export MAGENTA='\033[0;35m'
export CYAN='\033[0;36m'
export WHITE='\033[0;37m'
export GRAY='\033[0;90m'
export BOLD='\033[1m'
export DIM='\033[2m'
export RESET='\033[0m'

log() {
    echo -e "${GRAY}[$(date '+%Y-%m-%d %H:%M:%S')]${RESET} ${GREEN}✓${RESET} $1"
}

error() {
    echo -e "${GRAY}[$(date '+%Y-%m-%d %H:%M:%S')]${RESET} ${RED}✗${RESET} $1" >&2
}

info() {
    echo -e "${GRAY}[$(date '+%Y-%m-%d %H:%M:%S')]${RESET} ${BLUE}ℹ${RESET} $1"
}

warn() {
    echo -e "${GRAY}[$(date '+%Y-%m-%d %H:%M:%S')]${RESET} ${YELLOW}⚠${RESET} $1"
}

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
    
    info "Loading ${CYAN}${script}${RESET}..."
    curl -sSf "$url" -o "$temp" || {
        error "Failed to download ${script}"
        exit 1
    }
    
    source "$temp" || {
        error "Failed to source ${script}"
        rm -f "$temp"
        exit 1
    }
    rm -f "$temp"
}

cleanup() {
    error "Installation failed. Cleaning up..."
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    rm -f "$SYSTEMD_SERVICE"
    systemctl daemon-reload 2>/dev/null || true
    rm -f "$HELPER_FILE"
    exit 1
}

trap cleanup ERR INT TERM

show_completion() {
    local current=$(cat "$WORK_DIR/.current_version" 2>/dev/null || echo "unknown")
    local bun_ver=$("$BUN_PATH" --version 2>/dev/null || echo "unknown")

    clear
    cat << EOF

${BOLD}${GREEN} ✦ Installation Complete ✦ ${RESET}
${GRAY}────────────────────────────────────────────────────────────${RESET}

${BOLD}${CYAN}System Information${RESET}
${GRAY}────────────────────────────────────────────────────────────${RESET}
  ${WHITE}Operating System${RESET} : ${YELLOW}${OS_ID:-unknown}${RESET} ${DIM}${OS_VERSION:-}${RESET}
  ${WHITE}Liora Version${RESET}    : ${MAGENTA}${current}${RESET}
  ${WHITE}Bun Runtime${RESET}      : ${CYAN}v${bun_ver}${RESET}

${BOLD}${CYAN}Installation Paths${RESET}
${GRAY}────────────────────────────────────────────────────────────${RESET}
  ${WHITE}Bot Directory${RESET} : ${DIM}${WORK_DIR}${RESET}
  ${WHITE}Configuration${RESET} : ${DIM}${WORK_DIR}/.env${RESET}
  ${WHITE}Log Directory${RESET} : ${DIM}${WORK_DIR}/logs/${RESET}
  ${WHITE}CLI Command${RESET}   : ${DIM}/usr/local/bin/bot${RESET}

${BOLD}${CYAN}Quick Start${RESET}
${GRAY}────────────────────────────────────────────────────────────${RESET}
  ${GREEN}bot start${RESET}   → Start the WhatsApp bot
  ${GREEN}bot log${RESET}     → View live logs
  ${GREEN}bot status${RESET}  → Check bot status
  ${GREEN}bot${RESET}         → Show all commands

${BOLD}${CYAN}Next Steps${RESET}
${GRAY}────────────────────────────────────────────────────────────${RESET}
  ${DIM}1.${RESET} ${CYAN}bot config${RESET}   → Review configuration
  ${DIM}2.${RESET} ${CYAN}bot start${RESET}    → Launch the bot
  ${DIM}3.${RESET} ${CYAN}bot log${RESET}      → Monitor activity

${GRAY}────────────────────────────────────────────────────────────${RESET}
${DIM}Repository:${RESET} ${BLUE}https://github.com/naruyaizumi/liora${RESET}
${DIM}Issues:${RESET}     ${BLUE}https://github.com/naruyaizumi/liora/issues${RESET}

${GRAY}────────────────────────────────────────────────────────────${RESET}
${DIM}Liora Bot is ready to operate.${RESET}

EOF
}

print_banner() {
    clear
    cat << "EOF"
${BOLD}${MAGENTA}
 ✦ LIORA BOT INSTALLER ✦
${RESET}
${GRAY}────────────────────────────────────────${RESET}
${CYAN}Repo${RESET}   : ${BLUE}github.com/naruyaizumi/liora${RESET}
${CYAN}License${RESET}: Apache 2.0
${CYAN}Author${RESET} : Naruya Izumi
${GRAY}────────────────────────────────────────${RESET}
EOF
}

main() {
    print_banner
    check_curl
    
    load_script "deps.sh"
    load_script "version.sh"
    load_script "config.sh"
    load_script "service.sh"
    load_script "cli.sh"
    
    install_dependencies
    select_version
    clone_and_install
    configure_bot
    create_service
    create_cli
    show_completion
}

main "$@"