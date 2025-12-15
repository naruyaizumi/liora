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

setup_pm2_service() {
    local service_name="$1"
    local work_dir="$2"
    
    print_info "Setting up PM2 process manager..."
    
    if ! command -v pm2 &> /dev/null; then
        print_info "Installing PM2 globally..."
        npm install -g pm2 || {
            print_error "Failed to install PM2"
            exit 1
        }
    fi
    
    PM2_VERSION=$(pm2 -v)
    print_success "PM2 installed: v$PM2_VERSION"
    
    print_info "Creating PM2 ecosystem configuration..."
    
    cat > "$work_dir/ecosystem.config.js" <<'EOFPM2'
module.exports = {
  apps: [{
    name: 'liora',
    script: './src/index.js',
    cwd: '/root/liora',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/root/.pm2/logs/liora-error.log',
    out_file: '/root/.pm2/logs/liora-out.log',
    log_file: '/root/.pm2/logs/liora-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 5000,
    listen_timeout: 10000,
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',
    exp_backoff_restart_delay: 100
  }]
};
EOFPM2
    
    print_success "PM2 ecosystem configuration created"
    
    print_info "Setting up PM2 startup script..."
    pm2 startup systemd -u root --hp /root || {
        print_warning "PM2 startup setup may have failed, but continuing..."
    }
    
    print_success "PM2 service setup completed"
}