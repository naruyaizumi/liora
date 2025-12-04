#!/bin/bash
# Liora Bot - Main Script
# Version: 1.0.0
# Description: WhatsApp bot installer

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/lib/shell"

source "${LIB_DIR}/logger.sh"
source "${LIB_DIR}/distro.sh"
source "${LIB_DIR}/cleanup.sh"
source "${LIB_DIR}/git.sh"
source "${LIB_DIR}/nodejs.sh"
source "${LIB_DIR}/postgres.sh"
source "${LIB_DIR}/redis.sh"
source "${LIB_DIR}/rust.sh"
source "${LIB_DIR}/bun.sh"
source "${LIB_DIR}/ffmpeg.sh"
source "${LIB_DIR}/liora.sh"
source "${LIB_DIR}/systemd.sh"
source "${LIB_DIR}/cli.sh"

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