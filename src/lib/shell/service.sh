#!/bin/bash

create_service() {
    print_info "Creating systemd service..."
    
    cat > "$SERVICE_FILE" <<'EOL'
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
Restart=always
RestartSec=5
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=60
SuccessExitStatus=0 130 143 SIGINT SIGTERM

MemoryHigh=300M
MemoryMax=350M
MemorySwapMax=256M
CPUWeight=100
CPUQuota=200%
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
ReadWritePaths=
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
EOL

    systemctl daemon-reload || {
        print_error "Failed to reload systemd"
        exit 1
    }
    
    systemctl enable "$SERVICE_NAME" || {
        print_error "Failed to enable service"
        exit 1
    }
    
    print_success "Systemd service created"
}

print_completion() {
    CURRENT_VERSION=$(cat "$WORK_DIR/.current_version" 2>/dev/null || echo "unknown")
    BUN_VERSION=$("$BUN_PATH" --version 2>/dev/null || echo "unknown")
    
    cat << EOF

+---------------------------------------------------+
|                                                   |
|           Installation Complete!                  |
|                                                   |
+---------------------------------------------------+

System Information:
--------------------
  OS:        $OS_ID
  Liora:     $CURRENT_VERSION
  Bun:       v$BUN_VERSION

Installation Details:
--------------------
  Directory: $WORK_DIR
  Service:   $SERVICE_NAME
  Config:    $WORK_DIR/.env

+---------------------------------------------------+
|              Quick Start Guide                    |
+---------------------------------------------------+

1. Start the bot:
   $ bot start

2. View logs:
   $ bot log

3. Check status:
   $ bot status

Available Commands:
--------------------
  bot              - Show all commands
  bot start        - Start bot
  bot stop         - Stop bot
  bot restart      - Restart bot
  bot log          - View live logs
  bot status       - Check status
  bot update       - Update bot
  bot config       - Edit config
  bot version      - Show versions

+---------------------------------------------------+

EOF
}