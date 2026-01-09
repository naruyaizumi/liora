#!/bin/bash

create_cli() {
    print_info "Creating CLI tool..."
    
    cat > "$HELPER_FILE" <<'EOFCLI'
#!/bin/bash

SERVICE="liora"
WORK_DIR="/root/liora"
BUN_PATH="/root/.bun/bin/bun"
REPO_URL="https://github.com/naruyaizumi/liora.git"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_error() { echo -e "${RED}✗${NC} $1" >&2; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

get_available_versions() {
    git ls-remote --tags --refs "$REPO_URL" 2>/dev/null | 
    grep -oP 'refs/tags/(v)?\d+\.\d+\.\d+$' | 
    sed 's|refs/tags/||' | 
    sort -Vr
}

get_latest_tag() {
    get_available_versions | head -1
}

check_config() {
    [ ! -f "$WORK_DIR/.env" ] && { print_error ".env not found"; return 1; }
    local num=$(grep "^PAIRING_NUMBER=" "$WORK_DIR/.env" | cut -d= -f2 | tr -d ' ')
    [ -z "$num" ] && { print_error "PAIRING_NUMBER empty"; print_info "Edit config: bot config"; return 1; }
    return 0
}

interactive_update() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${MAGENTA}  Update Bot Version${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""
    
    cd "$WORK_DIR" || exit 1
    
    CURRENT=$(cat .current_version 2>/dev/null || echo "unknown")
    LATEST=$(get_latest_tag)
    VERSIONS=($(get_available_versions))
    
    echo -e "${BLUE}Current version:${NC} ${GREEN}$CURRENT${NC}"
    [ -n "$LATEST" ] && echo -e "${BLUE}Latest version:${NC} ${GREEN}$LATEST${NC}"
    echo ""
    
    if [ "$CURRENT" = "$LATEST" ]; then
        echo -e "${GREEN}You are already on the latest version!${NC}"
        echo ""
        read -p "$(echo -e ${CYAN}Show all versions? ${YELLOW}[y/N]:${NC} )" show_all
        [[ ! $show_all =~ ^[Yy]$ ]] && exit 0
    fi
    
    echo -e "${GREEN}  [1]${NC} Update to Latest ($LATEST)"
    echo -e "${YELLOW}  [2]${NC} Switch to Development (main)"
    echo -e "${BLUE}  [3]${NC} Rollback to Specific Version"
    echo -e "${RED}  [4]${NC} Cancel"
    echo ""
    
    read -p "$(echo -e ${CYAN}Choose option [1-4]:${NC} )" choice
    
    case $choice in
        1)
            TARGET_VERSION="$LATEST"
            ;;
        2)
            TARGET_VERSION="main"
            ;;
        3)
            echo ""
            echo -e "${BLUE}Available versions:${NC}"
            for i in "${!VERSIONS[@]}"; do
                current_mark=""
                [ "${VERSIONS[$i]}" = "$CURRENT" ] && current_mark=" ${GREEN}(current)${NC}"
                echo -e "  ${GREEN}$((i+1)).${NC} ${VERSIONS[$i]}$current_mark"
            done
            echo ""
            read -p "$(echo -e ${CYAN}Enter version number:${NC} )" ver_choice
            if [[ $ver_choice =~ ^[0-9]+$ ]] && [ $ver_choice -ge 1 ] && [ $ver_choice -le ${#VERSIONS[@]} ]; then
                TARGET_VERSION="${VERSIONS[$((ver_choice-1))]}"
            else
                print_error "Invalid selection"
                exit 1
            fi
            ;;
        4)
            print_info "Update cancelled"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            exit 1
            ;;
    esac
    
    echo ""
    print_info "Updating to $TARGET_VERSION..."
    
    systemctl stop $SERVICE
    git fetch --all --tags --quiet
    
    if [ "$TARGET_VERSION" = "main" ]; then
        git checkout main || { print_error "Checkout failed"; exit 1; }
        git pull origin main || { print_error "Pull failed"; exit 1; }
    else
        git checkout "$TARGET_VERSION" || { print_error "Checkout failed"; exit 1; }
    fi
    
    echo "$TARGET_VERSION" > .current_version
    
    print_info "Installing packages..."
    "$BUN_PATH" install || { print_error "Install failed"; exit 1; }
    
    print_success "Updated to $TARGET_VERSION"
    systemctl start $SERVICE && print_success "Bot started" || print_error "Start failed"
}

case "$1" in
    start)
        check_config || exit 1
        print_info "Starting bot..."
        systemctl start $SERVICE && print_success "Bot started" || print_error "Failed to start"
        ;;
    stop)
        print_info "Stopping bot..."
        systemctl stop $SERVICE && print_success "Bot stopped" || print_error "Failed to stop"
        ;;
    restart)
        check_config || exit 1
        print_info "Restarting bot..."
        systemctl restart $SERVICE && print_success "Bot restarted" || print_error "Failed to restart"
        ;;
    reload)
        print_info "Reloading configuration..."
        systemctl reload $SERVICE && print_success "Configuration reloaded" || print_error "Failed to reload"
        ;;
    status)
        systemctl status $SERVICE --no-pager
        ;;
    log|logs)
        print_info "Showing live logs (Ctrl+C to exit)..."
        journalctl -u $SERVICE -f -o cat
        ;;
    tail)
        journalctl -u $SERVICE -n ${2:-50} --no-pager
        ;;
    config)
        "${EDITOR:-nano}" "$WORK_DIR/.env"
        ;;
    check-config)
        check_config && print_success "Configuration valid" || exit 1
        ;;
    update)
        interactive_update
        ;;
    version)
        echo ""
        [ -f "$WORK_DIR/.current_version" ] && echo -e "${BLUE}Current:${NC} ${GREEN}$(cat $WORK_DIR/.current_version)${NC}"
        LATEST=$(get_latest_tag)
        [ -n "$LATEST" ] && echo -e "${BLUE}Latest:${NC} ${GREEN}$LATEST${NC}"
        echo ""
        ;;
    health)
        echo ""
        echo -e "${CYAN}═══════════════════════════════════════${NC}"
        echo -e "${MAGENTA}  Health Check${NC}"
        echo -e "${CYAN}═══════════════════════════════════════${NC}"
        echo ""
        echo -e "${BLUE}Service Status:${NC}"
        if systemctl is-active --quiet $SERVICE; then
            echo -e "  ${GREEN}✓${NC} Bot is running"
        else
            echo -e "  ${RED}✗${NC} Bot is not running"
        fi
        echo ""
        ;;
    *)
        cat <<EOF

${CYAN}╔══════════════════════════════════════════╗
║                                          ║
║             LIORA BOT CLI                ║
║                                          ║
╚══════════════════════════════════════════╝${NC}

${MAGENTA}Service Management:${NC}
  ${GREEN}bot start${NC}          Start the bot
  ${GREEN}bot stop${NC}           Stop the bot
  ${GREEN}bot restart${NC}        Restart the bot
  ${GREEN}bot reload${NC}         Reload configuration
  ${GREEN}bot status${NC}         Show service status

${MAGENTA}Logs & Monitoring:${NC}
  ${GREEN}bot log${NC}            View live logs
  ${GREEN}bot logs${NC}           View live logs (alias)
  ${GREEN}bot tail [n]${NC}       Show last N lines (default: 50)

${MAGENTA}Configuration:${NC}
  ${GREEN}bot config${NC}         Edit configuration file
  ${GREEN}bot check-config${NC}   Validate configuration

${MAGENTA}Maintenance:${NC}
  ${GREEN}bot update${NC}         Interactive version update
  ${GREEN}bot version${NC}        Show current & latest version
  ${GREEN}bot health${NC}         Health check

${CYAN}═══════════════════════════════════════════${NC}

EOF
        ;;
esac
EOFCLI

    chmod +x "$HELPER_FILE" || {
        print_error "Failed to make CLI executable"
        exit 1
    }
    
    print_success "CLI tool created"
}