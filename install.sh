#!/bin/bash
# Liora Bot - Main Script
# Version: 1.0.0
# Description: WhatsApp bot installer

set -e

GITHUB_RAW_BASE="https://raw.githubusercontent.com/naruyaizumi/liora/main/lib/shell"

load_library() {
    local lib_name="$1"
    local lib_url="${GITHUB_RAW_BASE}/${lib_name}"
    local temp_file="/tmp/${lib_name}"
    
    print_info "Loading library: ${lib_name}"
    
    if ! curl -sSf "${lib_url}" -o "${temp_file}"; then
        echo "Error: Failed to download library ${lib_name}"
        exit 1
    fi
    
    source "${temp_file}"
    
    rm -f "${temp_file}"
}

curl -sSf "${GITHUB_RAW_BASE}/logger.sh" -o /tmp/logger.sh
source /tmp/logger.sh
rm -f /tmp/logger.sh

print_info "Starting Liora Bot installation..."

load_library "distro.sh"
load_library "cleanup.sh"
load_library "git.sh"
load_library "nodejs.sh"
load_library "postgres.sh"
load_library "redis.sh"
load_library "rust.sh"
load_library "bun.sh"
load_library "ffmpeg.sh"
load_library "liora.sh"
load_library "systemd.sh"
load_library "cli.sh"

SERVICE_NAME="liora"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
HELPER_FILE="/usr/local/bin/bot"
WORK_DIR="/root/liora"
BUN_PATH="/root/.bun/bin/bun"
SUPERVISOR_PATH="${WORK_DIR}/lib/rs/target/release/liora-rs"
TIME_ZONE="Asia/Jakarta"
DB_NAME="liora"
DB_USER="liora"
DB_PASSWORD="naruyaizumi"
DB_HOST="localhost"
DB_PORT="5432"
REDIS_HOST="localhost"
REDIS_PORT="6379"
REPO_URL="https://github.com/naruyaizumi/liora.git"

if ! command -v curl &> /dev/null; then
    echo "Installing curl..."
    if command -v apt-get &> /dev/null; then
        apt-get update && apt-get install -y curl
    elif command -v yum &> /dev/null; then
        yum install -y curl
    elif command -v dnf &> /dev/null; then
        dnf install -y curl
    elif command -v pacman &> /dev/null; then
        pacman -Sy --noconfirm curl
    elif command -v apk &> /dev/null; then
        apk add curl
    else
        echo "Error: Could not install curl. Please install it manually."
        exit 1
    fi
fi

trap cleanup_on_error ERR

main() {
    print_info "Starting Liora Bot installation..."
    echo ""
    validate_os
    install_system_dependencies
    install_ffmpeg
    validate_ffmpeg
    install_nodejs
    install_postgresql
    setup_postgresql_database
    configure_postgresql_auth
    test_postgresql_connection
    install_redis
    configure_redis
    test_redis_connection
    install_rust
    install_bun
    setup_liora
    create_env_files
    install_liora_dependencies
    build_rust_supervisor
    create_systemd_service
    create_cli_helper
    print_completion_message
}

main "$@"