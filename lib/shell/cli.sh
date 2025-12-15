#!/bin/bash

create_cli_helper() {
    local helper_file="$1"
    local service_name="$2"
    local work_dir="$3"
    local repo_url="$4"
    local proc_manager="$5"
    local pkg_manager="$6"
    
    print_info "Creating helper CLI tool..."
    
    cat > "$helper_file" <<'EOFHELPER'
#!/bin/bash

SERVICE="liora"
WORK_DIR="/root/liora"
NVM_DIR="$HOME/.nvm"
REPO_URL="https://github.com/naruyaizumi/liora.git"
ENV_FILE="$WORK_DIR/.env"
VERSION_FILE="$WORK_DIR/.current_version"
CONFIG_FILE="$WORK_DIR/.liora_config"
BACKUP_DIR="/root/.liora_backups"

[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" 2>/dev/null

load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
    else
        PROCESS_MANAGER="systemd"
        PACKAGE_MANAGER="pnpm"
    fi
}

load_config

print_header() {
    echo ""
    echo "================================================================"
    echo "  $1"
    echo "================================================================"
    echo ""
}

print_separator() {
    echo "================================================================"
}

get_package_manager_cmd() {
    case "$PACKAGE_MANAGER" in
        npm)
            echo "npm"
            ;;
        yarn)
            echo "yarn"
            ;;
        pnpm|*)
            echo "pnpm"
            ;;
    esac
}

install_dependencies() {
    local pm=$(get_package_manager_cmd)
    echo "[INFO] Installing dependencies with $pm..."
    
    case "$pm" in
        npm)
            npm install
            ;;
        yarn)
            yarn install
            ;;
        pnpm)
            pnpm install
            ;;
    esac
}

get_latest_release_tag() {
    local latest_tag
    latest_tag=$(git ls-remote --tags --refs "$REPO_URL" | 
                 grep -oP 'refs/tags/v\d+\.\d+\.\d+$' | 
                 sed 's|refs/tags/||' | 
                 sort -V | 
                 tail -1)
    
    if [ -z "$latest_tag" ]; then
        latest_tag=$(git ls-remote --tags --refs "$REPO_URL" | 
                     grep -oP 'refs/tags/\d+\.\d+\.\d+$' | 
                     sed 's|refs/tags/||' | 
                     sort -V | 
                     tail -1)
    fi
    
    echo "$latest_tag"
}

get_all_release_tags() {
    git ls-remote --tags --refs "$REPO_URL" | 
        grep -oP 'refs/tags/(v?)\d+\.\d+\.\d+$' | 
        sed 's|refs/tags/||' | 
        sort -V -r
}

check_pairing_number() {
    if [ ! -f "$ENV_FILE" ]; then
        echo "[ERROR] Configuration file not found"
        return 1
    fi
    
    local pairing_num
    pairing_num=$(grep "^PAIRING_NUMBER=" "$ENV_FILE" | cut -d= -f2 | tr -d ' ')
    
    if [ -z "$pairing_num" ]; then
        echo "[WARNING] PAIRING_NUMBER is empty"
        echo "Configure with: bot config"
        return 1
    fi
    
    return 0
}

backup_version() {
    mkdir -p "$BACKUP_DIR"
    
    if [ -f "$VERSION_FILE" ]; then
        local current_ver=$(cat "$VERSION_FILE")
        local timestamp=$(date +%Y%m%d_%H%M%S)
        local backup_file="$BACKUP_DIR/version_${current_ver}_${timestamp}.backup"
        
        echo "$current_ver" > "$backup_file"
        echo "[INFO] Backed up version: $current_ver"
    fi
}

list_backups() {
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
        echo "[INFO] No version backups found"
        return
    fi
    
    echo "Available version backups:"
    echo ""
    ls -1t "$BACKUP_DIR" 2>/dev/null | while read backup; do
        local version=$(cat "$BACKUP_DIR/$backup" 2>/dev/null)
        local date=$(echo "$backup" | grep -oP '\d{8}_\d{6}')
        echo "  • $version (backed up: $date)"
    done
}

service_start() {
    if [ "$PROCESS_MANAGER" == "pm2" ]; then
        cd "$WORK_DIR" || exit 1
        pm2 start ecosystem.config.js
        pm2 save
    else
        systemctl start $SERVICE
    fi
}

service_stop() {
    if [ "$PROCESS_MANAGER" == "pm2" ]; then
        pm2 stop $SERVICE
    else
        systemctl stop $SERVICE
    fi
}

service_restart() {
    if [ "$PROCESS_MANAGER" == "pm2" ]; then
        pm2 restart $SERVICE
    else
        systemctl restart $SERVICE
    fi
}

service_status() {
    if [ "$PROCESS_MANAGER" == "pm2" ]; then
        pm2 status $SERVICE
        echo ""
        pm2 describe $SERVICE
    else
        systemctl status $SERVICE --no-pager -l
    fi
}

service_logs() {
    local lines="${1:-100}"
    
    if [ "$PROCESS_MANAGER" == "pm2" ]; then
        pm2 logs $SERVICE --lines "$lines"
    else
        journalctl -u $SERVICE -n "$lines" --no-pager
    fi
}

service_logs_live() {
    if [ "$PROCESS_MANAGER" == "pm2" ]; then
        pm2 logs $SERVICE
    else
        journalctl -u $SERVICE -f -o cat
    fi
}

case "$1" in
    start)
        if ! check_pairing_number; then
            exit 1
        fi
        echo "[INFO] Starting bot..."
        service_start && echo "[SUCCESS] Bot started" || echo "[ERROR] Failed to start"
        sleep 2
        service_status
        ;;
        
    stop)
        echo "[INFO] Stopping bot..."
        service_stop && echo "[SUCCESS] Bot stopped" || echo "[ERROR] Failed to stop"
        ;;
        
    restart)
        if ! check_pairing_number; then
            exit 1
        fi
        echo "[INFO] Restarting bot..."
        service_restart && echo "[SUCCESS] Bot restarted" || echo "[ERROR] Failed to restart"
        ;;
        
    status)
        service_status
        ;;
        
    log)
        echo "[INFO] Showing live logs (Ctrl+C to exit)..."
        service_logs_live
        ;;
        
    logs)
        local lines=${2:-100}
        echo "[INFO] Showing last $lines log entries..."
        service_logs "$lines"
        ;;
        
    update)
        print_header "Liora Bot Update Manager"
        
        cd "$WORK_DIR" || { echo "[ERROR] Failed to change directory"; exit 1; }
        
        if [ ! -d ".git" ]; then
            echo "[ERROR] Not a git repository"
            exit 1
        fi
        
        CURRENT_VERSION=$(cat "$VERSION_FILE" 2>/dev/null || git describe --tags 2>/dev/null || echo "unknown")
        echo "[INFO] Current version: $CURRENT_VERSION"
        echo ""
        
        git fetch --tags --quiet 2>/dev/null || { echo "[ERROR] Failed to fetch updates"; exit 1; }
        
        echo "Update options:"
        echo "  1) Update to latest release tag"
        echo "  2) Update to specific release tag"
        echo "  3) Update to main branch (development)"
        echo "  4) Cancel"
        echo ""
        read -p "Choose option [1-4]: " choice
        
        case $choice in
            1)
                LATEST_TAG=$(get_latest_release_tag)
                if [ -z "$LATEST_TAG" ]; then
                    echo "[ERROR] No release tags found"
                    exit 1
                fi
                
                if [ "$CURRENT_VERSION" == "$LATEST_TAG" ]; then
                    echo "[INFO] Already on latest version: $LATEST_TAG"
                    exit 0
                fi
                
                TARGET_VERSION="$LATEST_TAG"
                ;;
            2)
                echo ""
                echo "Available release tags:"
                get_all_release_tags | head -20
                echo ""
                read -p "Enter tag version (e.g., v1.0.0): " TARGET_VERSION
                
                if [ -z "$TARGET_VERSION" ]; then
                    echo "[ERROR] No version specified"
                    exit 1
                fi
                ;;
            3)
                TARGET_VERSION="main"
                echo "[WARNING] Switching to development branch"
                ;;
            4)
                echo "[INFO] Update cancelled"
                exit 0
                ;;
            *)
                echo "[ERROR] Invalid option"
                exit 1
                ;;
        esac
        
        echo ""
        echo "[INFO] Updating to: $TARGET_VERSION"
        read -p "Continue? (y/N): " confirm
        confirm=${confirm:-N}
        
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            echo "[INFO] Update cancelled"
            exit 0
        fi
        
        backup_version
        
        service_stop || { echo "[ERROR] Failed to stop service"; exit 1; }
        
        if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
            echo "[INFO] Stashing local changes..."
            git stash push -m "Auto-stash $(date +%Y%m%d_%H%M%S)" || {
                echo "[ERROR] Failed to stash changes"
                exit 1
            }
        fi
        
        if [ "$TARGET_VERSION" == "main" ]; then
            git checkout main 2>/dev/null || git checkout master 2>/dev/null
            git pull origin main 2>/dev/null || git pull origin master 2>/dev/null
        else
            git checkout "$TARGET_VERSION" || {
                echo "[ERROR] Failed to checkout version"
                exit 1
            }
        fi
        
        echo "$TARGET_VERSION" > "$VERSION_FILE"
        
        install_dependencies || { echo "[ERROR] Dependency installation failed"; exit 1; }
        
        echo "[SUCCESS] Update completed to $TARGET_VERSION"
        echo "[INFO] Restarting service..."
        
        service_restart && echo "[SUCCESS] Bot restarted" || echo "[ERROR] Failed to restart"
        sleep 2
        service_status
        ;;
        
    rollback)
        print_header "Version Rollback"
        
        list_backups
        echo ""
        
        cd "$WORK_DIR" || { echo "[ERROR] Failed to change directory"; exit 1; }
        
        echo "Available versions:"
        get_all_release_tags | head -20
        echo ""
        
        read -p "Enter version to rollback to: " rollback_version
        
        if [ -z "$rollback_version" ]; then
            echo "[ERROR] No version specified"
            exit 1
        fi
        
        echo "[WARNING] Rolling back to: $rollback_version"
        read -p "Continue? (y/N): " confirm
        confirm=${confirm:-N}
        
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            echo "[INFO] Rollback cancelled"
            exit 0
        fi
        
        backup_version
        service_stop
        
        git fetch --tags --quiet
        git checkout "$rollback_version" || {
            echo "[ERROR] Failed to checkout version"
            exit 1
        }
        
        echo "$rollback_version" > "$VERSION_FILE"
        
        install_dependencies || { echo "[ERROR] Dependency installation failed"; exit 1; }
        
        echo "[SUCCESS] Rolled back to $rollback_version"
        
        service_restart && echo "[SUCCESS] Bot restarted" || echo "[ERROR] Failed to restart"
        ;;
        
    config)
        if [ "$2" == "reset" ]; then
            echo "[WARNING] This will reset configuration to default"
            read -p "Continue? (y/N): " confirm
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                cat > "$ENV_FILE" <<'EOF'
PAIRING_NUMBER=

OWNERS=[]
GROUP_LINK=https://chat.whatsapp.com
WATERMARK=Liora
AUTHOR=Naruya Izumi
STICKPACK=Liora Stickers
STICKAUTH=Naruya Izumi

NODE_ENV=production
TZ=Asia/Jakarta
EOF
                echo "[SUCCESS] Configuration reset to default"
            fi
        else
            if command -v nano &> /dev/null; then
                nano "$ENV_FILE"
            elif command -v vim &> /dev/null; then
                vim "$ENV_FILE"
            else
                echo "[ERROR] No text editor found (nano or vim)"
                exit 1
            fi
        fi
        ;;
        
    config-show)
        if [ ! -f "$ENV_FILE" ]; then
            echo "[ERROR] Configuration file not found"
            exit 1
        fi
        
        print_header "Current Configuration"
        cat "$ENV_FILE"
        echo ""
        ;;
        
    config-backup)
        if [ ! -f "$ENV_FILE" ]; then
            echo "[ERROR] Configuration file not found"
            exit 1
        fi
        
        mkdir -p "$BACKUP_DIR"
        local backup_file="$BACKUP_DIR/config_$(date +%Y%m%d_%H%M%S).env"
        cp "$ENV_FILE" "$backup_file"
        echo "[SUCCESS] Configuration backed up to: $backup_file"
        ;;
        
    version)
        if [ -f "$VERSION_FILE" ]; then
            CURRENT_VERSION=$(cat "$VERSION_FILE")
            echo "[INFO] Current version: $CURRENT_VERSION"
        else
            echo "[WARNING] Version file not found"
        fi
        
        LATEST_TAG=$(get_latest_release_tag)
        if [ -n "$LATEST_TAG" ]; then
            echo "[INFO] Latest release: $LATEST_TAG"
        fi
        
        echo ""
        list_backups
        ;;
        
    info)
        print_header "Liora Bot System Information"
        
        echo "Service Status:"
        if [ "$PROCESS_MANAGER" == "pm2" ]; then
            if pm2 describe $SERVICE &>/dev/null; then
                echo "  • Service: RUNNING (PM2)"
            else
                echo "  • Service: STOPPED (PM2)"
            fi
        else
            if systemctl is-active --quiet $SERVICE; then
                echo "  • Service: RUNNING (systemd)"
            else
                echo "  • Service: STOPPED (systemd)"
            fi
        fi
        
        echo ""
        echo "Configuration:"
        echo "  • Process Manager: $PROCESS_MANAGER"
        echo "  • Package Manager: $PACKAGE_MANAGER"
        
        echo ""
        echo "Version Information:"
        if [ -f "$VERSION_FILE" ]; then
            echo "  • Current: $(cat $VERSION_FILE)"
        fi
        echo "  • Latest: $(get_latest_release_tag)"
        
        echo ""
        echo "Bot Configuration:"
        if [ -f "$ENV_FILE" ]; then
            local pairing=$(grep "^PAIRING_NUMBER=" "$ENV_FILE" | cut -d= -f2)
            if [ -n "$pairing" ]; then
                echo "  • Pairing: Configured"
            else
                echo "  • Pairing: NOT CONFIGURED"
            fi
        fi
        
        echo ""
        echo "System Resources:"
        echo "  • Node.js: $(node -v 2>/dev/null || echo 'Not found')"
        echo "  • $(get_package_manager_cmd): v$($(get_package_manager_cmd) -v 2>/dev/null || echo 'Not found')"
        echo "  • FFmpeg: $(ffmpeg -version 2>/dev/null | head -n1 | awk '{print $3}' || echo 'Not found')"
        
        if [ "$PROCESS_MANAGER" == "pm2" ] && command -v pm2 &> /dev/null; then
            echo "  • PM2: v$(pm2 -v 2>/dev/null || echo 'Not found')"
        fi
        
        echo ""
        echo "Disk Usage:"
        du -sh "$WORK_DIR" 2>/dev/null | awk '{print "  • Bot Directory: " $1}'
        
        echo ""
        ;;
        
    clean)
        echo "[WARNING] This will clean node_modules and reinstall dependencies"
        read -p "Continue? (y/N): " confirm
        
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            echo "[INFO] Cancelled"
            exit 0
        fi
        
        cd "$WORK_DIR" || exit 1
        
        service_stop
        
        echo "[INFO] Removing node_modules..."
        rm -rf node_modules
        
        install_dependencies || { echo "[ERROR] Failed to install dependencies"; exit 1; }
        
        echo "[SUCCESS] Cleanup completed"
        ;;
        
    help|--help|-h|"")
        print_header "Liora Bot Management CLI"
        
        echo "Service Management:"
        echo "  bot start              Start the bot service"
        echo "  bot stop               Stop the bot service"
        echo "  bot restart            Restart the bot service"
        echo "  bot status             Show service status"
        echo ""
        
        echo "Configuration:"
        echo "  bot config             Edit configuration file"
        echo "  bot config reset       Reset configuration to default"
        echo "  bot config-show        Display current configuration"
        echo "  bot config-backup      Backup current configuration"
        echo ""
        
        echo "Logging:"
        echo "  bot log                Show live logs (real-time)"
        echo "  bot logs [N]           Show last N log entries (default: 100)"
        echo ""
        
        echo "Updates & Versioning:"
        echo "  bot update             Interactive update manager"
        echo "  bot rollback           Rollback to previous version"
        echo "  bot version            Show version information"
        echo ""
        
        echo "Maintenance:"
        echo "  bot clean              Clean and reinstall dependencies"
        echo "  bot info               Show system information"
        echo ""
        
        echo "Help:"
        echo "  bot help               Show this help message"
        echo ""
        ;;
        
    *)
        echo "[ERROR] Unknown command: $1"
        echo "Run 'bot help' for available commands"
        exit 1
        ;;
esac
EOFHELPER
    
    chmod +x "$helper_file" || {
        print_error "Failed to make helper CLI executable"
        exit 1
    }
    
    print_success "Helper CLI created at $helper_file"
}