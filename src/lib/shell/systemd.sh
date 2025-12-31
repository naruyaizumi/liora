#!/bin/bash

create_systemd_service() {
    print_info "Creating systemd service..."
    
    SERVICE_PATH="${BUN_INSTALL}/bin:${HOME}/.cargo/bin:${NODE_DIR}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
    
    cat > "$SERVICE_FILE" <<EOL
[Unit]
Description=Liora WhatsApp Bot
After=network-online.target systemd-resolved.service postgresql.service redis-server.service redis.service
Wants=network-online.target systemd-resolved.service
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=root
WorkingDirectory=${WORK_DIR}
ExecStart=${SUPERVISOR_PATH}
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=mixed
KillSignal=SIGTERM
FinalKillSignal=SIGKILL
SendSIGKILL=yes
TimeoutStopSec=30s
RestartSec=5s
Restart=always
EnvironmentFile=${WORK_DIR}/.env
Environment=NODE_ENV=production
Environment=TZ=${TIME_ZONE}
Environment=BUN_PATH=${BUN_PATH}
Environment=UV_THREADPOOL_SIZE=16
Environment=UNDICI_CONNECT_TIMEOUT=600000
Environment=UNDICI_REQUEST_TIMEOUT=600000
Environment=UNDICI_HEADERS_TIMEOUT=600000
Environment=PATH=${SERVICE_PATH}
StandardOutput=journal
StandardError=journal
SyslogIdentifier=liora-bot
Nice=-10
IOSchedulingClass=2
IOSchedulingPriority=4
LimitNOFILE=1048576
LimitNPROC=1048576
LimitSTACK=infinity
OOMScoreAdjust=-900
PrivateTmp=true
ProtectSystem=off
ProtectHome=false
NoNewPrivileges=false
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
ReadWritePaths=/etc/resolv.conf /etc/hosts /etc/ssl/certs ${WORK_DIR}

[Install]
WantedBy=multi-user.target
EOL

    print_success "Systemd service file created"
    
    print_info "Enabling systemd service..."
    systemctl daemon-reload || {
        print_error "Failed to reload systemd daemon"
        exit 1
    }
    
    systemctl enable "$SERVICE_NAME" || {
        print_error "Failed to enable service"
        exit 1
    }
    
    print_success "Systemd service created and enabled"
}