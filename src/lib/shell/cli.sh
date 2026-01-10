#!/bin/bash

create_cli() {
    print_info "Creating CLI tool..."
    
    cat > "$HELPER_FILE" <<'EOFCLI'
#!/bin/bash

SERVICE="liora"
WORK_DIR="/root/liora"
BUN_PATH="/root/.bun/bin/bun"
REPO_URL="https://github.com/naruyaizumi/liora.git"

print_error() { echo "[ERROR] $1" >&2; }
print_success() { echo "[SUCCESS] $1"; }
print_info() { echo "[INFO] $1"; }
print_warning() { echo "[WARNING] $1"; }

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
    cat << "EOF"

+---------------------------------------+
| Update Bot Version                    |
+---------------------------------------+

EOF
    
    cd "$WORK_DIR" || exit 1
    
    CURRENT=$(cat .current_version 2>/dev/null || echo "unknown")
    LATEST=$(get_latest_tag)
    VERSIONS=($(get_available_versions))
    
    echo "Current version: $CURRENT"
    [ -n "$LATEST" ] && echo "Latest version:  $LATEST"
    echo ""
    
    if [ "$CURRENT" = "$LATEST" ]; then
        echo "You are already on the latest version!"
        echo ""
        printf "liora> Show all versions? [y/N]: "
        read show_all
        [[ ! $show_all =~ ^[Yy]$ ]] && exit 0
    fi
    
    echo "  [1] Update to Latest ($LATEST)"
    echo "  [2] Switch to Development (main)"
    echo "  [3] Rollback to Specific Version"
    echo "  [4] Cancel"
    echo ""
    
    while true; do
        printf "liora> "
        read choice
        
        case $choice in
            1)
                TARGET_VERSION="$LATEST"
                break
                ;;
            2)
                TARGET_VERSION="main"
                break
                ;;
            3)
                echo ""
                echo "Available versions:"
                for i in "${!VERSIONS[@]}"; do
                    current_mark=""
                    [ "${VERSIONS[$i]}" = "$CURRENT" ] && current_mark=" (current)"
                    echo "  $((i+1)). ${VERSIONS[$i]}$current_mark"
                done
                echo ""
                
                while true; do
                    printf "liora> "
                    read ver_choice
                    
                    if [[ $ver_choice =~ ^[0-9]+$ ]] && [ $ver_choice -ge 1 ] && [ $ver_choice -le ${#VERSIONS[@]} ]; then
                        TARGET_VERSION="${VERSIONS[$((ver_choice-1))]}"
                        break 2
                    else
                        print_error "Invalid selection. Enter 1-${#VERSIONS[@]}"
                    fi
                done
                ;;
            4)
                print_info "Update cancelled"
                exit 0
                ;;
            *)
                print_error "Invalid option. Choose 1-4"
                ;;
        esac
    done
    
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
        [ -f "$WORK_DIR/.current_version" ] && echo "Current: $(cat $WORK_DIR/.current_version)"
        LATEST=$(get_latest_tag)
        [ -n "$LATEST" ] && echo "Latest:  $LATEST"
        echo ""
        ;;
    health)
        cat << "EOF"

+---------------------------------------+
| Health Check                          |
+---------------------------------------+

Service Status:
---------------
EOF
        if systemctl is-active --quiet $SERVICE; then
            echo "  [OK] Bot is running"
        else
            echo "  [FAIL] Bot is not running"
        fi
        echo ""
        ;;
    *)
        cat <<EOF

+------------------------------------------+
|                                          |
|           LIORA BOT CLI                  |
|                                          |
+------------------------------------------+

Service Management:
--------------------
  bot start          Start the bot
  bot stop           Stop the bot
  bot restart        Restart the bot
  bot reload         Reload configuration
  bot status         Show service status

Logs & Monitoring:
--------------------
  bot log            View live logs
  bot logs           View live logs (alias)
  bot tail [n]       Show last N lines (default: 50)

Configuration:
--------------------
  bot config         Edit configuration file
  bot check-config   Validate configuration

Maintenance:
--------------------
  bot update         Interactive version update
  bot version        Show current & latest version
  bot health         Health check

+------------------------------------------+

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