#!/bin/bash

set -e

WORK_DIR="/root/liora"
LIB_DIR="$WORK_DIR/lib/shell"
mkdir -p "$LIB_DIR"

FILES=(logger.sh system.sh nodejs.sh liora.sh service.sh cli.sh interactive.sh)
RAW_BASE_URL="https://raw.githubusercontent.com/naruyaizumi/liora/main/lib/shell"

for file in "${FILES[@]}"; do
    echo "Downloading $file..."
    curl -sSfL "$RAW_BASE_URL/$file" -o "$LIB_DIR/$file"
done

for file in "${FILES[@]}"; do
    source "$LIB_DIR/$file"
done

SERVICE_NAME="liora"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
HELPER_FILE="/usr/local/bin/bot"
TIME_ZONE="Asia/Jakarta"
REPO_URL="https://github.com/naruyaizumi/liora.git"
CONFIG_FILE="$WORK_DIR/.liora_config"

cleanup_on_error() {
    print_error "Installation failed. Cleaning up..."
    
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    fi
    if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    fi
    
    rm -f "$SERVICE_FILE"
    rm -f "$HELPER_FILE"
    
    if command -v pm2 &> /dev/null; then
        pm2 delete "$SERVICE_NAME" 2>/dev/null || true
        pm2 save --force 2>/dev/null || true
    fi
    
    systemctl daemon-reload 2>/dev/null || true
    
    print_info "Cleanup completed. You can run the script again."
    exit 1
}

trap cleanup_on_error ERR

print_installation_summary() {
    local work_dir="$1"
    local pkg_manager="$2"
    local proc_manager="$3"
    
    echo ""
    print_separator
    print_success "Liora Bot Installation Complete!"
    print_separator
    echo ""
    
    echo "System Information:"
    OS_ID=$(grep '^ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
    OS_VERSION_ID=$(grep '^VERSION_ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
    echo "  • OS: $OS_ID $OS_VERSION_ID"
    
    if command -v node &> /dev/null; then
        echo "  • Node.js: $(node -v)"
    fi
    
    echo "  • Package Manager: $pkg_manager"
    echo "  • Process Manager: $proc_manager"
    
    if command -v ffmpeg &> /dev/null; then
        FFMPEG_VERSION=$(ffmpeg -version | head -n1 | awk '{print $3}' | cut -d. -f1)
        echo "  • FFmpeg: $FFMPEG_VERSION"
    fi
    
    if [ -f "$work_dir/.current_version" ]; then
        echo "  • Liora: $(cat $work_dir/.current_version)"
    fi
    
    echo ""
    print_separator
    echo "Quick Start Commands:"
    print_separator
    echo ""
    echo "  bot start        - Start the bot service"
    echo "  bot stop         - Stop the bot service"
    echo "  bot restart      - Restart the bot service"
    echo "  bot status       - Check service status"
    echo "  bot log          - View live logs"
    echo "  bot config       - Edit configuration"
    echo "  bot update       - Update to latest version"
    echo ""
    echo "Type 'bot help' for all available commands"
    echo ""
    
    if grep -q "^PAIRING_NUMBER=$" "$work_dir/.env" 2>/dev/null; then
        print_warning "Remember to start the bot with: bot start"
    else
        print_warning "Configure pairing number first: bot config"
    fi
    
    echo ""
}

main() {
    print_header "Liora Bot Installer"
    print_info "Starting installation process..."
    echo ""
    
    validate_os "$WORK_DIR"
    install_system_dependencies
    validate_ffmpeg
    install_nodejs
    
    PKG_MANAGER=""
    PROC_MANAGER=""
    
    interactive_configure "$WORK_DIR" PKG_MANAGER PROC_MANAGER
    
    save_installation_config "$CONFIG_FILE" "$PKG_MANAGER" "$PROC_MANAGER"
    
    setup_liora "$WORK_DIR" "$REPO_URL" "$TIME_ZONE" "$PKG_MANAGER"
    
    if [ "$PROC_MANAGER" == "systemd" ]; then
        create_systemd_service "$SERVICE_NAME" "$SERVICE_FILE" "$WORK_DIR" "$TIME_ZONE"
    else
        setup_pm2_service "$SERVICE_NAME" "$WORK_DIR"
    fi
    
    create_cli_helper "$HELPER_FILE" "$SERVICE_NAME" "$WORK_DIR" "$REPO_URL" "$PROC_MANAGER" "$PKG_MANAGER"
    
    print_installation_summary "$WORK_DIR" "$PKG_MANAGER" "$PROC_MANAGER"
}

main