#!/bin/bash

create_cli_helper() {
    print_info "Creating helper CLI tool..."
    
    cat > "$HELPER_FILE" <<'EOFHELPER'
#!/bin/bash

SERVICE="liora"
WORK_DIR="/root/liora"
BUN_PATH="/root/.bun/bin/bun"
SUPERVISOR_PATH="${WORK_DIR}/lib/rs/target/release/liora-rs"
NVM_DIR="$HOME/.nvm"
REPO_URL="https://github.com/naruyaizumi/liora.git"

[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" 2>/dev/null
[ -s "$HOME/.cargo/env" ] && \. "$HOME/.cargo/env" 2>/dev/null

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

check_pairing_number() {
    if [ ! -f "$WORK_DIR/.env" ]; then
        echo "[ERROR] Configuration file not found"
        return 1
    fi
    
    local pairing_num
    pairing_num=$(grep "^PAIRING_NUMBER=" "$WORK_DIR/.env" | cut -d= -f2 | tr -d ' ')
    
    if [ -z "$pairing_num" ]; then
        echo "[ERROR] PAIRING_NUMBER is empty in .env file"
        echo "[INFO] Configure: nano $WORK_DIR/.env"
        echo "[INFO] Example: PAIRING_NUMBER=6281234567890"
        return 1
    fi
    
    return 0
}

case "$1" in
    start)
        if ! check_pairing_number; then exit 1; fi
        echo "[INFO] Starting bot..."
        systemctl start $SERVICE && echo "[SUCCESS] Bot started" || echo "[ERROR] Failed to start"
        ;;
    stop)
        echo "[INFO] Stopping bot..."
        systemctl stop $SERVICE && echo "[SUCCESS] Bot stopped" || echo "[ERROR] Failed to stop"
        ;;
    restart)
        if ! check_pairing_number; then exit 1; fi
        echo "[INFO] Restarting bot..."
        systemctl restart $SERVICE && echo "[SUCCESS] Bot restarted" || echo "[ERROR] Failed to restart"
        ;;
    reload)
        echo "[INFO] Reloading configuration (SIGHUP)..."
        systemctl reload $SERVICE && echo "[SUCCESS] Configuration reloaded" || echo "[ERROR] Failed to reload"
        ;;
    status)
        systemctl status $SERVICE --no-pager -l
        ;;
    enable)
        systemctl enable $SERVICE && echo "[SUCCESS] Service enabled" || echo "[ERROR] Failed to enable"
        ;;
    disable)
        systemctl disable $SERVICE && echo "[SUCCESS] Service disabled" || echo "[ERROR] Failed to disable"
        ;;
    kill)
        if [ -z "$2" ]; then
            echo "[ERROR] Usage: bot kill <SIGNAL>"
            echo "[INFO] Signals: HUP INT TERM KILL USR1 USR2 QUIT ABRT ALRM CONT STOP"
            exit 1
        fi
        SIGNAL=$(echo "$2" | tr '[:lower:]' '[:upper:]')
        echo "[INFO] Sending SIG${SIGNAL}..."
        systemctl kill -s "$SIGNAL" $SERVICE && echo "[SUCCESS] Signal sent" || echo "[ERROR] Failed"
        ;;
    log)
        echo "[INFO] Showing logs (Ctrl+C to exit)..."
        journalctl -u $SERVICE -f -o cat
        ;;
    logs)
        echo "[INFO] Last 100 log lines..."
        journalctl -u $SERVICE -n 100 --no-pager
        ;;
    follow)
        echo "[INFO] Following logs (Ctrl+C to exit)..."
        journalctl -u $SERVICE -f
        ;;
    tail)
        LINES=${2:-50}
        echo "[INFO] Last $LINES log lines..."
        journalctl -u $SERVICE -n "$LINES" --no-pager
        ;;
    head)
        LINES=${2:-50}
        echo "[INFO] First $LINES log lines..."
        journalctl -u $SERVICE -n "$LINES" --no-pager --reverse
        ;;
    since)
        if [ -z "$2" ]; then
            echo "[ERROR] Usage: bot since <time>"
            echo "[INFO] Example: bot since '1 hour ago'"
            exit 1
        fi
        journalctl -u $SERVICE --since "$2" --no-pager
        ;;
    until)
        if [ -z "$2" ]; then
            echo "[ERROR] Usage: bot until <time>"
            exit 1
        fi
        journalctl -u $SERVICE --until "$2" --no-pager
        ;;
    between)
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "[ERROR] Usage: bot between <start> <end>"
            exit 1
        fi
        journalctl -u $SERVICE --since "$2" --until "$3" --no-pager
        ;;
    grep)
        if [ -z "$2" ]; then
            echo "[ERROR] Usage: bot grep <pattern>"
            exit 1
        fi
        journalctl -u $SERVICE --no-pager | grep -i "$2"
        ;;
    errors)
        echo "[INFO] Error logs..."
        journalctl -u $SERVICE -p err --no-pager
        ;;
    warnings)
        echo "[INFO] Warning logs..."
        journalctl -u $SERVICE -p warning --no-pager
        ;;
    clear-logs)
        echo "[WARNING] Clear all service logs? (yes/no)"
        read -r confirmation
        if [[ "$confirmation" != "yes" ]]; then
            echo "[INFO] Cancelled"
            exit 0
        fi
        journalctl --vacuum-time=1s -u $SERVICE && echo "[SUCCESS] Logs cleared" || echo "[ERROR] Failed"
        ;;
    vacuum)
        if [ -z "$2" ]; then
            echo "[ERROR] Usage: bot vacuum <time|size>"
            echo "[INFO] Examples: bot vacuum 7d, bot vacuum 100M"
            exit 1
        fi
        if [[ "$2" =~ [0-9]+[dhmsMG] ]]; then
            if [[ "$2" =~ [MG]$ ]]; then
                journalctl --vacuum-size="$2" -u $SERVICE
            else
                journalctl --vacuum-time="$2" -u $SERVICE
            fi
        fi
        ;;
    watch)
        watch -n 2 "systemctl status $SERVICE --no-pager -l"
        ;;
    config)
        if command -v nano &> /dev/null; then
            nano "$WORK_DIR/.env"
        elif command -v vim &> /dev/null; then
            vim "$WORK_DIR/.env"
        elif command -v vi &> /dev/null; then
            vi "$WORK_DIR/.env"
        else
            echo "[ERROR] No editor found"
            exit 1
        fi
        ;;
    edit-config)
        "${2:-nano}" "$WORK_DIR/.env"
        ;;
    view-config)
        cat "$WORK_DIR/.env"
        ;;
    check-config)
        if check_pairing_number; then
            echo "[SUCCESS] Configuration valid"
        else
            exit 1
        fi
        ;;
    backup-config)
        BACKUP_FILE="/root/liora-env-backup-$(date +%Y%m%d_%H%M%S).env"
        cp "$WORK_DIR/.env" "$BACKUP_FILE" && echo "[SUCCESS] Backed up to $BACKUP_FILE" || echo "[ERROR] Failed"
        ;;
    restore-config)
        if [ -z "$2" ]; then
            echo "[ERROR] Usage: bot restore-config <file>"
            exit 1
        fi
        if [ ! -f "$2" ]; then
            echo "[ERROR] File not found: $2"
            exit 1
        fi
        cp "$2" "$WORK_DIR/.env" && echo "[SUCCESS] Restored from $2" || echo "[ERROR] Failed"
        ;;
    list-backups)
        echo "[INFO] Configuration backups:"
        ls -lh /root/liora-env-backup-* 2>/dev/null || echo "[INFO] No backups found"
        ;;
    diff-config)
        if [ -z "$2" ]; then
            echo "[ERROR] Usage: bot diff-config <backup-file>"
            exit 1
        fi
        diff "$WORK_DIR/.env" "$2" || true
        ;;
    update)
        echo "[INFO] Checking for updates..."
        cd "$WORK_DIR" || { echo "[ERROR] Failed to cd"; exit 1; }
        
        if [ ! -d ".git" ]; then
            echo "[ERROR] Not a git repository"
            exit 1
        fi
        
        CURRENT_VERSION=$(cat "$WORK_DIR/.current_version" 2>/dev/null || echo "unknown")
        echo "[INFO] Current: $CURRENT_VERSION"
        
        git fetch --tags --quiet 2>/dev/null || { echo "[ERROR] Fetch failed"; exit 1; }
        
        LATEST_TAG=$(get_latest_release_tag)
        
        if [ -z "$LATEST_TAG" ]; then
            CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
            LOCAL_HASH=$(git rev-parse HEAD)
            REMOTE_HASH=$(git rev-parse origin/$CURRENT_BRANCH)
            
            if [ "$LOCAL_HASH" == "$REMOTE_HASH" ]; then
                echo "[SUCCESS] Already up to date"
                exit 0
            fi
            
            [ -n "$(git status --porcelain)" ] && git stash push -m "Auto-stash $(date +%Y%m%d_%H%M%S)"
            git pull origin "$CURRENT_BRANCH" || { echo "[ERROR] Pull failed"; exit 1; }
            echo "main" > "$WORK_DIR/.current_version"
        else
            echo "[INFO] Latest: $LATEST_TAG"
            
            if [ "$CURRENT_VERSION" == "$LATEST_TAG" ]; then
                echo "[SUCCESS] Already up to date"
                exit 0
            fi
            
            systemctl is-active --quiet $SERVICE && systemctl stop $SERVICE
            [ -n "$(git status --porcelain)" ] && git stash push -m "Auto-stash $(date +%Y%m%d_%H%M%S)"
            git checkout "$LATEST_TAG" || { echo "[ERROR] Checkout failed"; exit 1; }
            echo "$LATEST_TAG" > "$WORK_DIR/.current_version"
        fi
        
        "$BUN_PATH" install || { echo "[ERROR] Install failed"; exit 1; }
        cd "${WORK_DIR}/lib/rs" && cargo clean && cargo build --release || { echo "[ERROR] Build failed"; exit 1; }
        
        echo "[SUCCESS] Update completed"
        cd "$WORK_DIR" && systemctl restart $SERVICE && echo "[SUCCESS] Bot restarted" || echo "[ERROR] Restart failed"
        ;;
    version)
        if [ -f "$WORK_DIR/.current_version" ]; then
            echo "[INFO] Current: $(cat "$WORK_DIR/.current_version")"
        fi
        LATEST_TAG=$(get_latest_release_tag)
        [ -n "$LATEST_TAG" ] && echo "[INFO] Latest: $LATEST_TAG"
        ;;
    rebuild)
        echo "[INFO] Rebuilding supervisor..."
        cd "${WORK_DIR}/lib/rs" && cargo clean && cargo build --release || { echo "[ERROR] Build failed"; exit 1; }
        echo "[SUCCESS] Supervisor rebuilt"
        echo "[INFO] Restart to use: bot restart"
        ;;
    clean)
        echo "[WARNING] Clean artifacts? (yes/no)"
        read -r confirmation
        [[ "$confirmation" != "yes" ]] && exit 0
        systemctl stop $SERVICE 2>/dev/null || true
        cd "${WORK_DIR}/lib/rs" && cargo clean
        cd "$WORK_DIR" && rm -rf node_modules .bun-cache
        echo "[SUCCESS] Cleaned"
        ;;
    reinstall)
        echo "[WARNING] Reinstall? Type 'YES':"
        read -r confirmation
        [[ "$confirmation" != "YES" ]] && exit 0
        
        systemctl stop $SERVICE 2>/dev/null || true
        [ -f "$WORK_DIR/.env" ] && cp "$WORK_DIR/.env" "/root/.env.backup.$(date +%Y%m%d_%H%M%S)"
        mv "$WORK_DIR" "/root/liora.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || rm -rf "$WORK_DIR"
        
        LATEST_TAG=$(get_latest_release_tag)
        if [ -z "$LATEST_TAG" ]; then
            git clone "$REPO_URL" "$WORK_DIR"
        else
            git clone --branch "$LATEST_TAG" --depth 1 "$REPO_URL" "$WORK_DIR"
            echo "$LATEST_TAG" > "$WORK_DIR/.current_version"
        fi
        
        cd "$WORK_DIR" && "$BUN_PATH" install
        cd "${WORK_DIR}/lib/rs" && cargo build --release
        echo "[SUCCESS] Reinstalled"
        ;;
    daemon-reload)
        systemctl daemon-reload && echo "[SUCCESS] Daemon reloaded" || echo "[ERROR] Failed"
        ;;
    db-info)
        echo "Database Information:"
        echo "  Database: liora"
        echo "  User: liora"
        echo "  Password: naruyaizumi"
        echo "  Host: localhost:5432"
        echo "  Connection: postgresql://liora:naruyaizumi@localhost:5432/liora"
        export PGPASSWORD="naruyaizumi"
        psql -h localhost -U liora -d liora -c "SELECT 1;" &>/dev/null && echo "[SUCCESS] Connected" || echo "[ERROR] Failed"
        unset PGPASSWORD
        ;;
    redis-info)
        echo "Redis Information:"
        echo "  Host: localhost:6379"
        echo "  Connection: redis://localhost:6379"
        redis-cli ping &>/dev/null && echo "[SUCCESS] Connected (PONG)" || echo "[ERROR] Failed"
        redis-cli info server | grep -E "redis_version|uptime_in_seconds" | head -2
        ;;
    health)
        echo "=========================================="
        echo "        System Health Check"
        echo "=========================================="
        echo ""
        echo "PostgreSQL:"
        if systemctl is-active --quiet postgresql 2>/dev/null || systemctl is-active --quiet postgresql.service 2>/dev/null; then
            echo "  [OK] Service Running"
            sudo -u postgres psql -c "SELECT 1;" &>/dev/null && echo "  [OK] Responsive" || echo "  [FAIL] Not Responsive"
        else
            echo "  [FAIL] Not Running"
        fi
        echo ""
        echo "Redis:"
        if systemctl is-active --quiet redis 2>/dev/null || systemctl is-active --quiet redis-server 2>/dev/null; then
            echo "  [OK] Service Running"
            redis-cli ping &>/dev/null && echo "  [OK] Responsive" || echo "  [FAIL] Not Responsive"
        else
            echo "  [FAIL] Not Running"
        fi
        echo ""
        echo "Liora Bot:"
        if systemctl is-active --quiet $SERVICE; then
            echo "  [OK] Running"
            [ -f "$SUPERVISOR_PATH" ] && echo "  [OK] Binary Present" || echo "  [FAIL] Binary Missing"
            check_pairing_number &>/dev/null && echo "  [OK] Config Valid" || echo "  [FAIL] Config Invalid"
        else
            echo "  [FAIL] Not Running"
        fi
        echo ""
        echo "Disk:"
        df -h "$WORK_DIR" | tail -1 | awk '{print "  Used: "$3" / "$2" ("$5")"}'
        echo ""
        ;;
    pid)
        PID=$(systemctl show $SERVICE --property=MainPID --value)
        [ "$PID" != "0" ] && echo "[INFO] PID: $PID" || echo "[INFO] Not running"
        ;;
    uptime)
        systemctl show $SERVICE --property=ActiveEnterTimestamp --no-pager
        ;;
    runtime)
        systemctl show $SERVICE --property=ActiveEnterTimestamp,ExecMainStartTimestamp --no-pager
        ;;
    resources)
        echo "[INFO] Resource usage:"
        systemctl status $SERVICE --no-pager -l | grep -E "Memory|CPU|Tasks"
        ;;
    memory)
        systemctl show $SERVICE --property=MemoryCurrent --no-pager
        ;;
    cpu)
        systemctl show $SERVICE --property=CPUUsageNSec --no-pager
        ;;
    env)
        echo "[INFO] Environment variables:"
        systemctl show $SERVICE --property=Environment --no-pager
        ;;
    properties)
        systemctl show $SERVICE --no-pager
        ;;
    dependencies)
        systemctl list-dependencies $SERVICE --no-pager
        ;;
    tree)
        systemctl list-dependencies $SERVICE --no-pager --all
        ;;
    listen)
        echo "[INFO] Listening sockets:"
        ss -tlnp | grep -i liora || echo "[INFO] No listening sockets found"
        ;;
    connections)
        echo "[INFO] Active connections:"
        ss -tnp | grep -i liora || echo "[INFO] No connections"
        ;;
    processes)
        echo "[INFO] Process tree:"
        pstree -p $(systemctl show $SERVICE --property=MainPID --value) 2>/dev/null || echo "[INFO] Not running"
        ;;
    threads)
        PID=$(systemctl show $SERVICE --property=MainPID --value)
        if [ "$PID" != "0" ]; then
            echo "[INFO] Thread count:"
            ps -T -p "$PID" | wc -l
        else
            echo "[INFO] Not running"
        fi
        ;;
    files)
        PID=$(systemctl show $SERVICE --property=MainPID --value)
        if [ "$PID" != "0" ]; then
            echo "[INFO] Open files:"
            lsof -p "$PID" 2>/dev/null | wc -l
        else
            echo "[INFO] Not running"
        fi
        ;;
    limits)
        PID=$(systemctl show $SERVICE --property=MainPID --value)
        if [ "$PID" != "0" ]; then
            echo "[INFO] Resource limits:"
            cat /proc/"$PID"/limits
        else
            echo "[INFO] Not running"
        fi
        ;;
    strace)
        PID=$(systemctl show $SERVICE --property=MainPID --value)
        if [ "$PID" != "0" ]; then
            echo "[INFO] Tracing (Ctrl+C to stop)..."
            strace -p "$PID" 2>&1
        else
            echo "[INFO] Not running"
        fi
        ;;
    perf)
        PID=$(systemctl show $SERVICE --property=MainPID --value)
        if [ "$PID" != "0" ]; then
            echo "[INFO] Performance monitoring (Ctrl+C to stop)..."
            perf top -p "$PID"
        else
            echo "[INFO] Not running"
        fi
        ;;
    journal-size)
        journalctl --disk-usage
        ;;
    journal-verify)
        journalctl --verify
        ;;
    coredumps)
        echo "[INFO] Core dumps:"
        coredumpctl list 2>/dev/null || echo "[INFO] No core dumps"
        ;;
    export-logs)
        OUTPUT=${2:-"/root/liora-logs-$(date +%Y%m%d_%H%M%S).log"}
        journalctl -u $SERVICE --no-pager > "$OUTPUT" && echo "[SUCCESS] Exported to $OUTPUT" || echo "[ERROR] Failed"
        ;;
    export-json)
        OUTPUT=${2:-"/root/liora-logs-$(date +%Y%m%d_%H%M%S).json"}
        journalctl -u $SERVICE -o json --no-pager > "$OUTPUT" && echo "[SUCCESS] Exported to $OUTPUT" || echo "[ERROR] Failed"
        ;;
    benchmark)
        echo "[INFO] Running benchmark..."
        cd "$WORK_DIR/lib/rs" && cargo bench 2>/dev/null || echo "[INFO] No benchmarks available"
        ;;
    test)
        echo "[INFO] Running tests..."
        cd "$WORK_DIR" && "$BUN_PATH" test 2>/dev/null || echo "[INFO] No tests configured"
        cd "$WORK_DIR/lib/rs" && cargo test || echo "[INFO] Tests failed or not available"
        ;;
    lint)
        echo "[INFO] Running linter..."
        cd "$WORK_DIR/lib/rs" && cargo clippy || echo "[INFO] Clippy not available"
        ;;
    format)
        echo "[INFO] Formatting code..."
        cd "$WORK_DIR/lib/rs" && cargo fmt || echo "[INFO] Failed to format"
        ;;
    check)
        echo "[INFO] Checking code..."
        cd "$WORK_DIR/lib/rs" && cargo check || echo "[INFO] Check failed"
        ;;
    audit)
        echo "[INFO] Security audit..."
        cd "$WORK_DIR/lib/rs" && cargo audit 2>/dev/null || echo "[INFO] cargo-audit not installed"
        ;;
    outdated)
        echo "[INFO] Outdated dependencies..."
        cd "$WORK_DIR/lib/rs" && cargo outdated 2>/dev/null || echo "[INFO] cargo-outdated not installed"
        ;;
    *)
        cat <<EOF
==========================================
   Liora Bot Management CLI
==========================================

Service Control:
  bot start : Start bot
  bot stop : Stop bot
  bot restart : Restart bot
  bot reload : Reload config (SIGHUP)
  bot status : Service status
  bot enable : Enable auto-start
  bot disable : Disable auto-start
  bot watch : Watch status

Signal Control:
  bot kill <SIG> : Send signal (HUP/INT/TERM/KILL/USR1/USR2/etc)

Logging:
  bot log : Live logs (cat format)
  bot logs : Last 100 lines
  bot follow : Follow logs
  bot tail [n] : Last N lines
  bot head [n] : First N lines
  bot since <time> : Logs since time
  bot until <time> : Logs until time
  bot between <s> <e> : Logs between times
  bot grep <pattern> : Search logs
  bot errors : Error logs only
  bot warnings : Warning logs only
  bot clear-logs : Clear all logs
  bot vacuum <time|size> : Vacuum journal (7d/100M)
  bot export-logs [file] : Export logs to file
  bot export-json [file] : Export logs as JSON
  bot journal-size : Show journal disk usage
  bot journal-verify : Verify journal integrity

Configuration:
  bot config : Edit config
  bot edit-config [ed] : Edit with specific editor
  bot view-config : View config
  bot check-config : Validate config
  bot backup-config : Backup config
  bot restore-config <f> : Restore from backup
  bot list-backups : List config backups
  bot diff-config <f> : Diff with backup

Updates & Maintenance:
  bot update : Update to latest
  bot version : Show version
  bot rebuild : Rebuild supervisor
  bot clean : Clean artifacts
  bot reinstall : Complete reinstall

System Information:
  bot db-info : Database info
  bot redis-info : Redis info
  bot health : Health check
  bot pid : Process ID
  bot uptime : Service uptime
  bot runtime : Runtime info
  bot resources : Resource usage
  bot memory : Memory usage
  bot cpu : CPU usage
  bot env : Environment vars
  bot properties : All properties
  bot dependencies : Service dependencies
  bot tree : Dependency tree

Network & Processes:
  bot listen : Listening sockets
  bot connections : Active connections
  bot processes : Process tree
  bot threads : Thread count
  bot files : Open files
  bot limits : Resource limits
  bot coredumps : List core dumps

Development:
  bot test : Run tests
  bot benchmark : Run benchmarks
  bot lint : Run linter
  bot format : Format code
  bot check : Check code
  bot audit : Security audit
  bot outdated : Check outdated deps
  bot strace : Trace system calls
  bot perf : Performance monitor

Systemd:
  bot daemon-reload : Reload systemd

Signal Reference:
  SIGHUP : Reload config (no restart)
  SIGINT : Interrupt
  SIGTERM : Graceful shutdown
  SIGKILL : Force kill
  SIGUSR1 : User signal 1
  SIGUSR2 : User signal 2
  SIGQUIT : Quit with core dump
  SIGABRT : Abort
  SIGALRM : Alarm
  SIGCONT : Continue
  SIGSTOP : Stop

EOF
        exit 1
        ;;
esac
EOFHELPER

    chmod +x "$HELPER_FILE" || {
        print_error "Failed to make helper CLI executable"
        exit 1
    }
    
    print_success "Helper CLI created at $HELPER_FILE"
}

print_completion_message() {
    echo ""
    echo "=========================================="
    echo "  Installation Complete"
    echo "=========================================="
    echo ""
    echo "System Information:"
    echo "  OS: $OS_ID $OS_VERSION_ID"
    echo "  Distribution Base: $DISTRO_BASE"
    echo "  Package Manager: $PKG_MANAGER"
    echo "  Node.js: ${NODE_VERSION:-N/A}"
    echo "  Bun: ${BUN_VERSION:-N/A}"
    echo "  Rust: ${RUST_VERSION:-N/A}"
    echo "  PostgreSQL: ${PG_VERSION:-N/A}"
    echo "  Redis: ${REDIS_VERSION:-N/A}"
    echo "  FFmpeg: ${FFMPEG_VERSION:-N/A}"
    echo "  Liora: ${CURRENT_TAG:-N/A}"
    echo ""
    echo "Configuration:"
    echo "  Work Directory: $WORK_DIR"
    echo "  Database: postgresql://$DB_USER:***@$DB_HOST:$DB_PORT/$DB_NAME"
    echo "  Redis: redis://$REDIS_HOST:$REDIS_PORT"
    echo ""
    echo "=========================================="
    echo "  IMPORTANT: Configure Bot Number"
    echo "=========================================="
    echo ""
    echo "1. Edit configuration:"
    echo "   bot config"
    echo ""
    echo "2. Set PAIRING_NUMBER (without +):"
    echo "   PAIRING_NUMBER=6281234567890"
    echo ""
    echo "3. Verify configuration:"
    echo "   bot check-config"
    echo ""
    echo "4. Start the bot:"
    echo "   bot start"
    echo ""
    echo "Quick Commands:"
    echo "  bot start : Start bot"
    echo "  bot stop : Stop bot"
    echo "  bot restart : Restart bot"
    echo "  bot reload : Reload config"
    echo "  bot log : View logs"
    echo "  bot status : Check status"
    echo "  bot health : System health"
    echo "  bot update : Update bot"
    echo ""
    echo "For all commands: bot"
    echo ""
}