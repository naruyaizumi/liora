#!/bin/bash

create_service() {
    echo ""
    echo -e "${BOLD}${CYAN} ✦ Service Creation ✦ ${RESET}"
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    echo -e "${DIM}Create and configure systemd service for Liora.${RESET}"
    echo ""

    info "Creating systemd service..."
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    
    cat > "$SYSTEMD_SERVICE" <<'EOF'
[Unit]
Description=Liora WhatsApp Bot
Documentation=https://github.com/naruyaizumi/liora
Wants=network-online.target
After=network-online.target
AssertPathExists=/root/liora
AssertPathExists=/root/.bun/bin/bun
AssertFileNotEmpty=/root/liora/.env
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/root/liora
ExecStart=/root/.bun/bin/bun run --smol src/main.js
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=5
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=60
TimeoutStartSec=30
SuccessExitStatus=0 130 143 SIGINT SIGTERM

MemoryHigh=300M
MemoryMax=350M
MemorySwapMax=256M
CPUWeight=100
CPUQuota=200%
TasksMax=4096
LimitNOFILE=262144
LimitNPROC=4096
LimitCORE=0

NoNewPrivileges=no
ProtectSystem=no
ProtectHome=no
PrivateTmp=no
PrivateDevices=no
RestrictNamespaces=no
RestrictSUIDSGID=no
RestrictRealtime=no
SystemCallFilter=
SystemCallArchitectures=native
ReadWritePaths=/root/liora
ReadOnlyPaths=

EnvironmentFile=/root/liora/.env
Environment=NODE_ENV=production
Environment=TZ=Asia/Jakarta
Environment=PATH=/root/.bun/bin:/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=BUN_GARBAGE_COLLECTOR_LEVEL=2
Environment=BUN_JSC_useConcurrentJIT=yes
Environment=NODE_OPTIONS=--max-old-space-size=256
Environment=UV_THREADPOOL_SIZE=8
Environment=MALLOC_ARENA_MAX=2

StandardOutput=journal
StandardError=journal
SyslogIdentifier=liora-bot

[Install]
WantedBy=multi-user.target
EOF

    [ ! -f "$SYSTEMD_SERVICE" ] && {
        error "Failed to create service file"
        exit 1
    }
    
    systemctl daemon-reload || {
        error "Failed to reload systemd"
        exit 1
    }
    
    systemctl enable "$SERVICE_NAME" || {
        error "Failed to enable service"
        exit 1
    }
    
    log "Systemd service created and enabled"
    echo ""
    
    info "Creating health monitor script..."
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    
    cat > "$WORK_DIR/monitor.sh" <<'EOF'
#!/bin/bash

LOG_FILE="/root/liora/logs/monitor.log"

log_msg() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

check_service() {
    systemctl is-active --quiet liora 2>/dev/null
}

if ! check_service; then
    log_msg "Service down, attempting restart..."
    systemctl restart liora >> "$LOG_FILE" 2>&1
fi

if command -v free &>/dev/null; then
    MEM=$(free -m | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "${MEM%.*}" -gt 85 ]; then
        log_msg "High memory usage: ${MEM}%"
    fi
fi

if [ -d "/root/liora" ]; then
    DISK=$(df -h /root/liora 2>/dev/null | awk 'NR==2{print $5}' | tr -d '%')
    if [ -n "$DISK" ] && [ "$DISK" -gt 90 ]; then
        log_msg "High disk usage: ${DISK}%"
    fi
fi
EOF

    chmod +x "$WORK_DIR/monitor.sh"
    log "Health monitor created: ${DIM}${WORK_DIR}/monitor.sh${RESET}"
    echo ""
}