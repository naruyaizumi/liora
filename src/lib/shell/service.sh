#!/bin/bash
# Service creation and management

create_systemd() {
    info "Creating systemd service..."
    
    cat > "$SYSTEMD_SERVICE" <<'EOF'

EOF

    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    log "Systemd service created"
}

create_pm2_config() {
    info "Creating PM2 config..."
    
    cat > "$PM2_ECOSYSTEM" <<'EOF'

EOF

    mkdir -p "$WORK_DIR/logs"
    cd "$WORK_DIR"
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup systemd -u root --hp /root
    log "PM2 service created"
}

create_monitor() {
    info "Creating monitor script..."
    
    cat > "$WORK_DIR/monitor.sh" <<'EOF'
#!/bin/bash
LOG_FILE="/root/liora/logs/monitor.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }

check_service() {
    if systemctl is-active --quiet liora 2>/dev/null; then
        return 0
    elif pm2 list | grep -q "liora.*online" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

if ! check_service; then
    log "Service down, restarting..."
    bot restart
fi

# Resource checks
MEM=$(free -m | awk 'NR==2{print $3*100/$2}')
if [ "${MEM%.*}" -gt 85 ]; then
    log "High memory: ${MEM}%"
fi

DISK=$(df -h /root/liora | awk 'NR==2{print $5}' | tr -d '%')
if [ "$DISK" -gt 90 ]; then
    log "High disk: ${DISK}%"
fi
EOF

    chmod +x "$WORK_DIR/monitor.sh"
    log "Monitor script created"
}

create_service() {
    if [ "$PROCESS_MANAGER" = "systemd" ]; then
        create_systemd
    elif [ "$PROCESS_MANAGER" = "pm2" ]; then
        create_pm2_config
    fi
    create_monitor
}



#!/bin/bash
# Service Creation - FIXED VERSION

create_systemd() {
    info "Creating systemd service..."
    
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

# Resource Limits
MemoryHigh=300M
MemoryMax=350M
MemorySwapMax=256M
CPUWeight=100
CPUQuota=200%
TasksMax=4096
LimitNOFILE=262144
LimitNPROC=4096
LimitCORE=0

# Security Settings (Relaxed for WhatsApp bot)
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

# Environment
EnvironmentFile=/root/liora/.env
Environment=NODE_ENV=production
Environment=TZ=Asia/Jakarta
Environment=PATH=/root/.bun/bin:/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=BUN_GARBAGE_COLLECTOR_LEVEL=2
Environment=BUN_JSC_useConcurrentJIT=yes
Environment=NODE_OPTIONS=--max-old-space-size=256
Environment=UV_THREADPOOL_SIZE=8
Environment=MALLOC_ARENA_MAX=2

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=liora-bot

[Install]
WantedBy=multi-user.target
EOF

    # FIX: Verify file created
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
}

create_pm2_config() {
    info "Creating PM2 config..."
    
    # FIX: Verify PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        error "PM2 not found"
        exit 1
    fi
    
    cat > "$PM2_ECOSYSTEM" <<'EOF'
export default {
  apps: [{
    name: 'liora',
    script: 'src/main.js',
    cwd: '/root/liora',
    interpreter: '/root/.bun/bin/bun',
    interpreterArgs: 'run --smol',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000,
    max_memory_restart: '350M',
    error_file: '/root/liora/logs/pm2-error.log',
    out_file: '/root/liora/logs/pm2-out.log',
    log_file: '/root/liora/logs/pm2-combined.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    log_type: 'json',
    pid_file: '/root/liora/logs/liora.pid',
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,
    wait_ready: false,
    instance_var: 'INSTANCE_ID',
    combine_logs: true,
    vizion: true,
    post_update: ['bun install'],
    env: {
      NODE_ENV: 'production',
      TZ: 'Asia/Jakarta',
      BUN_GARBAGE_COLLECTOR_LEVEL: '2',
      BUN_JSC_useConcurrentJIT: 'yes',
      NODE_OPTIONS: '--max-old-space-size=256',
      UV_THREADPOOL_SIZE: '8',
      MALLOC_ARENA_MAX: '2'
    },
    env_development: {
      NODE_ENV: 'development',
      LOG_LEVEL: 'debug'
    },
    env_production: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    cron_restart: '',
    ignore_watch: ['node_modules', 'logs', '.git', 'baileys_store*'],
    watch_options: {
      followSymlinks: false,
      usePolling: false
    },
    kill_retry_time: 100,
    source_map_support: false,
    node_args: [],
    metadata: {
      author: 'Naruya Izumi',
      repository: 'https://github.com/naruyaizumi/liora',
      description: 'Liora WhatsApp Bot'
    }
  }],
  deploy: {
    production: {
      user: 'root',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/naruyaizumi/liora.git',
      path: '/root/liora',
      'post-deploy': 'bun install && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
EOF

    # FIX: Verify file created
    [ ! -f "$PM2_ECOSYSTEM" ] && {
        error "Failed to create PM2 config"
        exit 1
    }
    
    # Create logs directory
    mkdir -p "$WORK_DIR/logs"
    
    # Start with PM2
    cd "$WORK_DIR" || {
        error "Failed to enter work directory"
        exit 1
    }
    
    pm2 start ecosystem.config.js || {
        error "Failed to start with PM2"
        exit 1
    }
    
    pm2 save || {
        warn "Failed to save PM2 process list"
    }
    
    pm2 startup systemd -u root --hp /root || {
        warn "Failed to configure PM2 startup"
    }
    
    log "PM2 service created and started"
}

create_monitor() {
    info "Creating monitor script..."
    
    cat > "$WORK_DIR/monitor.sh" <<'EOF'
#!/bin/bash
# Health monitoring script

LOG_FILE="/root/liora/logs/monitor.log"

log_msg() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

check_service() {
    if systemctl is-active --quiet liora 2>/dev/null; then
        return 0
    elif command -v pm2 &>/dev/null && pm2 list 2>/dev/null | grep -q "liora.*online"; then
        return 0
    else
        return 1
    fi
}

# Check if service is running
if ! check_service; then
    log_msg "Service down, attempting restart..."
    if command -v bot &>/dev/null; then
        bot restart >> "$LOG_FILE" 2>&1
    fi
fi

# Resource monitoring
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

    chmod +x "$WORK_DIR/monitor.sh" || {
        warn "Failed to make monitor script executable"
    }
    
    log "Monitor script created"
}

create_service() {
    # FIX: Validate process manager
    if [ -z "$PROCESS_MANAGER" ]; then
        error "Process manager not set"
        exit 1
    fi
    
    if [ "$PROCESS_MANAGER" = "systemd" ]; then
        create_systemd
    elif [ "$PROCESS_MANAGER" = "pm2" ]; then
        create_pm2_config
    else
        error "Unknown process manager: $PROCESS_MANAGER"
        exit 1
    fi
    
    create_monitor
}

create_cli() {
    # FIX: Call the correct CLI creation function
    if [ "$PROCESS_MANAGER" = "systemd" ]; then
        create_cli_systemd
    elif [ "$PROCESS_MANAGER" = "pm2" ]; then
        create_cli_pm2
    else
        error "Unknown process manager: $PROCESS_MANAGER"
        exit 1
    fi
}