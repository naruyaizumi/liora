#!/bin/bash

create_cli() {
    info "Creating command-line interface..."
    echo -e "${GRAY}────────────────────────────────────────────────────────────────────────────${RESET}"
    
    cat > "$HELPER_FILE" <<'EOFCLI'
#!/bin/bash
set -euo pipefail

SERVICE="liora"
WORK_DIR="/root/liora"
BUN_PATH="/root/.bun/bin/bun"
REPO_URL="https://github.com/naruyaizumi/liora.git"
BACKUP_DIR="/root/liora_backups"

log() { echo "[$(date '+%H:%M:%S')] ✓ $1"; }
error() { echo "[$(date '+%H:%M:%S')] ✗ $1" >&2; }
info() { echo "[$(date '+%H:%M:%S')] ℹ $1"; }

get_versions() {
    git ls-remote --tags --refs "$REPO_URL" 2>/dev/null | 
    grep -oP 'refs/tags/(v)?\d+\.\d+\.\d+$' | 
    sed 's|refs/tags/||' | sort -Vr
}

get_latest() { get_versions | head -1; }

validate_sha() {
    echo "$1" | grep -qE '^[a-f0-9]{7,40}$'
}

check_config() {
    [ ! -f "$WORK_DIR/.env" ] && { error "Configuration file not found"; return 1; }
    local num=$(grep "^PAIRING_NUMBER=" "$WORK_DIR/.env" | cut -d= -f2 | tr -d ' ')
    [ -z "$num" ] && { error "PAIRING_NUMBER not configured"; return 1; }
    return 0
}

do_update() {
    cd "$WORK_DIR" || { error "Work directory not found"; exit 1; }
    
    local current=$(cat .current_version 2>/dev/null || echo "unknown")
    local latest=$(get_latest)
    
    echo "Current version: $current"
    echo "Latest version:  $latest"
    echo ""
    echo "1) Update to latest ($latest)"
    echo "2) Switch to development (main)"
    echo "3) Rollback to specific version"
    echo "4) Rollback to specific commit"
    echo "5) Cancel"
    echo ""
    echo -n "Select option: "
    read choice
    
    local target=""
    case $choice in
        1) target="$latest" ;;
        2) target="main" ;;
        3)
            local versions=($(get_versions))
            for i in "${!versions[@]}"; do
                echo "$((i+1))) ${versions[$i]}"
            done
            echo -n "Select version: "
            read v
            target="${versions[$((v-1))]}"
            ;;
        4)
            echo -n "Enter commit SHA: "
            read sha
            validate_sha "$sha" || { error "Invalid SHA"; exit 1; }
            target="$sha"
            ;;
        5) exit 0 ;;
        *) error "Invalid option"; exit 1 ;;
    esac
    
    systemctl stop $SERVICE
    git fetch --all --tags --quiet
    
    if [ "$target" = "main" ]; then
        git checkout main && git pull origin main
    else
        git checkout "$target"
    fi
    
    echo "$target" > .current_version
    "$BUN_PATH" install
    systemctl start $SERVICE
    log "Updated to $target"
}

do_backup() {
    mkdir -p "$BACKUP_DIR"
    local backup="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    cd "$WORK_DIR" || { error "Work directory not found"; exit 1; }
    tar -czf "$backup" --exclude='node_modules' --exclude='logs' --exclude='.git' . 2>/dev/null
    log "Backup created: $backup"
}

do_restore() {
    [ ! -d "$BACKUP_DIR" ] && { error "No backups found"; exit 1; }
    local backups=($(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null))
    [ ${#backups[@]} -eq 0 ] && { error "No backups found"; exit 1; }
    
    for i in "${!backups[@]}"; do
        echo "$((i+1))) $(basename ${backups[$i]})"
    done
    echo -n "Select backup: "
    read choice
    
    systemctl stop $SERVICE
    cd "$WORK_DIR" || { error "Work directory not found"; exit 1; }
    tar -xzf "${backups[$((choice-1))]}"
    systemctl start $SERVICE
    log "Backup restored"
}

do_clean() {
    [ -d "$WORK_DIR/logs" ] && find "$WORK_DIR/logs" -name "*.log" -mtime +7 -delete 2>/dev/null
    journalctl --vacuum-time=7d --quiet 2>/dev/null
    log "Logs cleaned"
}

do_stats() {
    echo ""
    echo "Service Status"
    echo "=============="
    systemctl status $SERVICE --no-pager -l
    echo ""
    echo "Resources"
    echo "========="
    local pid=$(systemctl show $SERVICE --property=MainPID --value 2>/dev/null)
    if [ "$pid" != "0" ] && [ -n "$pid" ]; then
        echo "Memory: $(($(ps -p $pid -o rss= 2>/dev/null || echo 0) / 1024))MB"
        echo "CPU: $(ps -p $pid -o %cpu= 2>/dev/null || echo 0)%"
    fi
    echo "Disk: $(du -sh $WORK_DIR 2>/dev/null | cut -f1)"
    echo ""
}

do_health() {
    echo ""
    echo "Health Check"
    echo "============"
    systemctl is-active --quiet $SERVICE && echo "[OK] Bot is running" || echo "[FAIL] Bot is stopped"
    [ -f "$WORK_DIR/.env" ] && echo "[OK] Config exists" || echo "[FAIL] Config missing"
    echo ""
}

case "${1:-help}" in
    start)
        check_config || exit 1
        systemctl start $SERVICE && log "Bot started" || error "Failed to start"
        ;;
    stop)
        systemctl stop $SERVICE && log "Bot stopped" || error "Failed to stop"
        ;;
    restart)
        check_config || exit 1
        systemctl restart $SERVICE && log "Bot restarted" || error "Failed to restart"
        ;;
    status) systemctl status $SERVICE --no-pager ;;
    log|logs) journalctl -u $SERVICE -f -o cat ;;
    tail) journalctl -u $SERVICE -n ${2:-50} --no-pager ;;
    config) ${EDITOR:-nano} "$WORK_DIR/.env" ;;
    update) do_update ;;
    version)
        echo "Current: $(cat $WORK_DIR/.current_version 2>/dev/null || echo unknown)"
        echo "Latest:  $(get_latest)"
        ;;
    backup) do_backup ;;
    restore) do_restore ;;
    clean) do_clean ;;
    stats) do_stats ;;
    health) do_health ;;
    monitor) [ -f "$WORK_DIR/monitor.sh" ] && bash "$WORK_DIR/monitor.sh" || error "Monitor not found" ;;
    help|--help|-h|*)
        cat <<EOF

Liora Bot Command-Line Interface
=================================

BASIC COMMANDS
  start          Start the WhatsApp bot
  stop           Stop the bot
  restart        Restart the bot
  status         Show service status

LOGS & MONITORING
  log            View live logs (Ctrl+C to exit)
  logs           Alias for 'log'
  tail [n]       Show last n log lines (default: 50)
  stats          Show performance statistics
  health         Run health check
  monitor        Run health monitor script

CONFIGURATION
  config         Edit .env configuration file

MAINTENANCE
  update         Interactive version update
  version        Show current and latest version
  backup         Create backup of bot data
  restore        Restore from backup
  clean          Clean old log files

HELP
  help           Show this help message
  --help         Show this help message
  -h             Show this help message

EXAMPLES
  bot start      Start the bot
  bot log        View live logs
  bot tail 100   Show last 100 log lines
  bot backup     Create a backup
  bot update     Update to latest version

For more information: https://github.com/naruyaizumi/liora

EOF
        ;;
esac
EOFCLI

    chmod +x "$HELPER_FILE" || {
        error "Failed to make CLI executable"
        exit 1
    }
    
    log "CLI tool created: ${DIM}/usr/local/bin/bot${RESET}"
    echo ""
}