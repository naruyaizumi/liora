#!/bin/bash

create_cli_pm2() {
    info "Creating CLI tool for PM2..."
    
    cat > "$HELPER_FILE" <<'EOFCLI'
#!/bin/bash
set -euo pipefail

APP="liora"
WORK_DIR="/root/liora"
BUN_PATH="/root/.bun/bin/bun"
REPO_URL="https://github.com/naruyaizumi/liora.git"
BACKUP_DIR="/root/liora_backups"

log() { echo "[$(date '+%H:%M:%S')] $1"; }
error() { echo "[ERROR] $1" >&2; }

get_versions() {
    git ls-remote --tags --refs "$REPO_URL" 2>/dev/null | 
    grep -oP 'refs/tags/(v)?\d+\.\d+\.\d+$' | 
    sed 's|refs/tags/||' | sort -Vr
}

get_latest() { get_versions | head -1; }

check_config() {
    [ ! -f "$WORK_DIR/.env" ] && { error ".env not found"; return 1; }
    local num=$(grep "^PAIRING_NUMBER=" "$WORK_DIR/.env" | cut -d= -f2 | tr -d ' ')
    [ -z "$num" ] && { error "PAIRING_NUMBER empty"; return 1; }
    return 0
}

check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        error "PM2 not installed"
        exit 1
    fi
}

do_update() {
    cd "$WORK_DIR" || { error "Work dir not found"; exit 1; }
    
    local current=$(cat .current_version 2>/dev/null || echo "unknown")
    local latest=$(get_latest)
    
    echo "Current: $current"
    echo "Latest: $latest"
    echo ""
    echo "1) Update to latest"
    echo "2) Development (main)"
    echo "3) Specific version"
    echo "4) Commit SHA"
    echo "5) Cancel"
    echo ""
    echo -n "Select: "
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
            echo -n "Select: "
            read v
            target="${versions[$((v-1))]}"
            ;;
        4)
            echo -n "SHA: "
            read sha
            [[ "$sha" =~ ^[a-f0-9]{7,40}$ ]] || { error "Invalid SHA"; exit 1; }
            target="$sha"
            ;;
        5) exit 0 ;;
        *) error "Invalid"; exit 1 ;;
    esac
    
    pm2 stop $APP 2>/dev/null || true
    git fetch --all --tags --quiet
    
    if [ "$target" = "main" ]; then
        git checkout main && git pull origin main
    else
        git checkout "$target"
    fi
    
    echo "$target" > .current_version
    "$BUN_PATH" install
    pm2 restart $APP
    log "Updated to $target"
}

do_backup() {
    mkdir -p "$BACKUP_DIR"
    local backup="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    cd "$WORK_DIR" || { error "Work dir not found"; exit 1; }
    tar -czf "$backup" --exclude='node_modules' --exclude='logs' --exclude='.git' . 2>/dev/null
    log "Backup: $backup"
}

do_restore() {
    [ ! -d "$BACKUP_DIR" ] && { error "No backups found"; exit 1; }
    local backups=($(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null))
    [ ${#backups[@]} -eq 0 ] && { error "No backups found"; exit 1; }
    
    for i in "${!backups[@]}"; do
        echo "$((i+1))) $(basename ${backups[$i]})"
    done
    echo -n "Select: "
    read choice
    
    pm2 stop $APP 2>/dev/null || true
    cd "$WORK_DIR" || { error "Work dir not found"; exit 1; }
    tar -xzf "${backups[$((choice-1))]}"
    pm2 restart $APP
    log "Restored"
}

do_clean() {
    [ -d "$WORK_DIR/logs" ] && find "$WORK_DIR/logs" -name "*.log" -mtime +7 -delete 2>/dev/null
    pm2 flush $APP 2>/dev/null
    log "Cleaned"
}

do_stats() {
    echo ""
    echo "PM2 Status"
    echo "=========="
    pm2 describe $APP 2>/dev/null || echo "Not running"
    echo ""
    echo "Disk: $(du -sh $WORK_DIR 2>/dev/null | cut -f1)"
    echo ""
}

do_health() {
    echo ""
    echo "Health Check"
    echo "============"
    pm2 list 2>/dev/null | grep -q "$APP.*online" && echo "[OK] Running" || echo "[FAIL] Stopped"
    [ -f "$WORK_DIR/.env" ] && echo "[OK] Config exists" || echo "[FAIL] No config"
    echo ""
}

case "${1:-help}" in
    start)
        check_pm2
        check_config || exit 1
        pm2 start $APP && log "Started" || error "Failed to start"
        ;;
    stop)
        check_pm2
        pm2 stop $APP && log "Stopped" || error "Failed to stop"
        ;;
    restart)
        check_pm2
        check_config || exit 1
        pm2 restart $APP && log "Restarted" || error "Failed to restart"
        ;;
    reload)
        check_pm2
        pm2 reload $APP && log "Reloaded" || error "Failed to reload"
        ;;
    status)
        check_pm2
        pm2 status $APP
        ;;
    list)
        check_pm2
        pm2 list
        ;;
    log|logs)
        check_pm2
        pm2 logs $APP --lines 100
        ;;
    tail)
        check_pm2
        pm2 logs $APP --lines ${2:-50} --nostream
        ;;
    flush)
        check_pm2
        pm2 flush $APP && log "Flushed" || error "Failed to flush"
        ;;
    monit)
        check_pm2
        pm2 monit
        ;;
    config) ${EDITOR:-nano} "$WORK_DIR/.env" ;;
    update) do_update ;;
    version)
        echo "Current: $(cat $WORK_DIR/.current_version 2>/dev/null || echo unknown)"
        echo "Latest: $(get_latest)"
        ;;
    backup) do_backup ;;
    restore) do_restore ;;
    clean) do_clean ;;
    stats) do_stats ;;
    health) do_health ;;
    monitor) [ -f "$WORK_DIR/monitor.sh" ] && bash "$WORK_DIR/monitor.sh" || error "Monitor script not found" ;;
    save)
        check_pm2
        pm2 save && log "Saved" || error "Failed to save"
        ;;
    startup)
        check_pm2
        pm2 startup systemd -u root --hp /root && log "Startup configured" || error "Failed"
        ;;
    help|--help|-h|*)
        cat <<EOF

Liora Bot CLI (PM2)
===================

Control:
  start       Start the bot
  stop        Stop the bot
  restart     Restart the bot
  reload      Reload (zero-downtime)
  status      Show PM2 status
  list        List all PM2 apps

Logs:
  log         View live logs
  tail [n]    Show last n lines
  flush       Clear logs
  monit       PM2 monitor (interactive)

Configuration:
  config      Edit .env file

Maintenance:
  update      Update to new version
  version     Show current/latest version
  backup      Create backup
  restore     Restore from backup
  clean       Clean old logs

PM2 Management:
  save        Save PM2 process list
  startup     Configure auto-start

Monitoring:
  stats       Show performance stats
  health      Health check
  monitor     Run monitor script

EOF
        ;;
esac
EOFCLI

    chmod +x "$HELPER_FILE" || {
        error "Failed to make CLI executable"
        exit 1
    }
    
    log "CLI tool created (PM2)"
}