#!/bin/bash

create_systemd_service() {
    local service_name="$1"
    local service_file="$2"
    local work_dir="$3"
    local time_zone="$4"
    
    print_info "Creating systemd service..."
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    NODE_PATH=$(which node)
    NODE_DIR=$(dirname "$NODE_PATH")
    
    SERVICE_PATH="${NODE_DIR}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
    
    cat > "$service_file" <<EOL
[Unit]
Description=Liora WhatsApp Bot
After=network-online.target systemd-resolved.service
Wants=network-online.target systemd-resolved.service
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=root
WorkingDirectory=${work_dir}
ExecStart=${NODE_PATH} ${work_dir}/src/index.js
KillMode=mixed
KillSignal=SIGTERM
FinalKillSignal=SIGKILL
SendSIGKILL=yes
TimeoutStopSec=30s
RestartSec=5s
Restart=always
EnvironmentFile=${work_dir}/.env
Environment=NODE_ENV=production
Environment=TZ=${time_zone}
Environment=PATH=${SERVICE_PATH}
StandardOutput=journal
StandardError=journal
SyslogIdentifier=liora-bot
Nice=-10
LimitNOFILE=1048576
LimitNPROC=1048576
ProtectSystem=off
ProtectHome=false
NoNewPrivileges=false

[Install]
WantedBy=multi-user.target
EOL
    
    print_success "Systemd service file created"
    
    print_info "Enabling systemd service..."
    systemctl daemon-reload || {
        print_error "Failed to reload systemd daemon"
        exit 1
    }
    
    systemctl enable "$service_name" || {
        print_error "Failed to enable service"
        exit 1
    }
    
    print_success "Systemd service created and enabled"
}