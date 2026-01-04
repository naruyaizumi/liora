#!/bin/bash

create_cli() {
    print_info "Creating CLI tool..."
    
    cat > "$HELPER_FILE" <<'EOFCLI'
#!/bin/bash

SERVICE="liora"
WORK_DIR="/root/liora"
BUN_PATH="/root/.bun/bin/bun"
SUPERVISOR_PATH="${WORK_DIR}/src/lib/rs/target/release/liora-rs"
REPO_URL="https://github.com/naruyaizumi/liora.git"

[ -s "$HOME/.cargo/env" ] && source "$HOME/.cargo/env" 2>/dev/null

get_latest_tag() {
    git ls-remote --tags --refs "$REPO_URL" | 
    grep -oP 'refs/tags/(v)?\d+\.\d+\.\d+$' | 
    sed 's|refs/tags/||' | 
    sort -V | 
    tail -1
}

check_config() {
    [ ! -f "$WORK_DIR/.env" ] && { echo "[ERROR] .env not found"; return 1; }
    local num=$(grep "^PAIRING_NUMBER=" "$WORK_DIR/.env" | cut -d= -f2 | tr -d ' ')
    [ -z "$num" ] && { echo "[ERROR] PAIRING_NUMBER empty"; echo "[INFO] Edit: bot config"; return 1; }
    return 0
}

case "$1" in
    start)
        check_config || exit 1
        echo "[INFO] Starting..."
        systemctl start $SERVICE && echo "[OK] Started" || echo "[FAIL]"
        ;;
    stop)
        echo "[INFO] Stopping..."
        systemctl stop $SERVICE && echo "[OK] Stopped" || echo "[FAIL]"
        ;;
    restart)
        check_config || exit 1
        echo "[INFO] Restarting..."
        systemctl restart $SERVICE && echo "[OK] Restarted" || echo "[FAIL]"
        ;;
    reload)
        echo "[INFO] Reloading config..."
        systemctl reload $SERVICE && echo "[OK]" || echo "[FAIL]"
        ;;
    status)
        systemctl status $SERVICE --no-pager
        ;;
    log|logs)
        journalctl -u $SERVICE -f -o cat
        ;;
    tail)
        journalctl -u $SERVICE -n ${2:-50} --no-pager
        ;;
    config)
        "${EDITOR:-nano}" "$WORK_DIR/.env"
        ;;
    check-config)
        check_config && echo "[OK] Valid" || exit 1
        ;;
    update)
        echo "[INFO] Updating..."
        cd "$WORK_DIR" || exit 1
        
        CURRENT=$(cat .current_version 2>/dev/null || echo "unknown")
        LATEST=$(get_latest_tag)
        
        echo "[INFO] Current: $CURRENT"
        [ -n "$LATEST" ] && echo "[INFO] Latest: $LATEST"
        
        [ "$CURRENT" = "$LATEST" ] && { echo "[OK] Up to date"; exit 0; }
        
        systemctl stop $SERVICE
        git fetch --tags --quiet
        
        if [ -n "$LATEST" ]; then
            git checkout "$LATEST" || { echo "[FAIL] Checkout failed"; exit 1; }
            echo "$LATEST" > .current_version
        else
            git pull origin main || { echo "[FAIL] Pull failed"; exit 1; }
        fi
        
        "$BUN_PATH" install || { echo "[FAIL] Install failed"; exit 1; }
        cd src/lib/rs && cargo build --release || { echo "[FAIL] Build failed"; exit 1; }
        
        echo "[OK] Updated"
        systemctl start $SERVICE && echo "[OK] Started" || echo "[FAIL] Start failed"
        ;;
    version)
        [ -f "$WORK_DIR/.current_version" ] && echo "Current: $(cat $WORK_DIR/.current_version)"
        LATEST=$(get_latest_tag)
        [ -n "$LATEST" ] && echo "Latest: $LATEST"
        ;;
    rebuild)
        echo "[INFO] Rebuilding..."
        cd "$WORK_DIR/src/lib/rs" && cargo build --release && echo "[OK]" || echo "[FAIL]"
        ;;
    health)
        echo "=== Health Check ==="
        echo ""
        echo "PostgreSQL:"
        systemctl is-active --quiet postgresql && echo "  [OK] Running" || echo "  [FAIL] Not running"
        echo ""
        echo "Redis:"
        systemctl is-active --quiet redis && echo "  [OK] Running" || echo "  [FAIL] Not running"
        echo ""
        echo "Liora:"
        systemctl is-active --quiet $SERVICE && echo "  [OK] Running" || echo "  [FAIL] Not running"
        ;;
    *)
        cat <<EOF
Liora Bot CLI

Service:
  start          Start bot
  stop           Stop bot
  restart        Restart bot
  reload         Reload config (SIGHUP)
  status         Service status

Logs:
  log/logs       Live logs
  tail [n]       Last N lines (default: 50)

Config:
  config         Edit config
  check-config   Validate config

Maintenance:
  update         Update to latest
  version        Show versions
  rebuild        Rebuild supervisor
  health         Health check

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