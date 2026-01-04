#!/bin/bash

create_service() {
    print_info "Creating systemd service..."
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    NODE_PATH=$(which node 2>/dev/null || echo "")
    NODE_DIR=$(dirname "$NODE_PATH" 2>/dev/null || echo "$NVM_DIR/versions/node/v24.12.0/bin")
    
    SERVICE_PATH="${BUN_INSTALL}/bin:${NODE_DIR}:/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin"
    
    cat > "$SERVICE_FILE" <<EOL
[Unit]
Description=Liora WhatsApp Bot
After=network-online.target postgresql.service redis.service
Wants=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=root
WorkingDirectory=${WORK_DIR}
ExecStart=${BUN_PATH} ${WORK_DIR}/src/index.js
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30s
RestartSec=5s
Restart=always

EnvironmentFile=${WORK_DIR}/.env
Environment=NODE_ENV=production
Environment=TZ=${TIME_ZONE}
Environment=BUN_PATH=${BUN_PATH}
Environment=PATH=${SERVICE_PATH}

StandardOutput=journal
StandardError=journal
SyslogIdentifier=liora

LimitNOFILE=1048576
LimitNPROC=1048576

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
    NODE_VERSION=$(node -v 2>/dev/null || echo "unknown")
    NPM_VERSION=$(npm -v 2>/dev/null || echo "unknown")
    PG_VERSION=$(psql -V 2>/dev/null | awk '{print $3}' || echo "unknown")
    REDIS_VERSION=$(redis-server --version 2>/dev/null | awk '{print $3}' | cut -d= -f2 || echo "unknown")
    
    cat <<EOF

==========================================
  Installation Complete
==========================================

System Info:
  OS: $OS_ID
  Liora: $CURRENT_VERSION
  Node.js: $NODE_VERSION
  npm: $NPM_VERSION
  Bun: $BUN_VERSION
  PostgreSQL: $PG_VERSION
  Redis: $REDIS_VERSION

Configuration:
  Directory: $WORK_DIR
  Database: postgresql://$DB_USER:***@$DB_HOST:$DB_PORT/$DB_NAME
  Redis: redis://$REDIS_HOST:$REDIS_PORT

==========================================
  IMPORTANT: Configure Bot
==========================================

1. Edit configuration:
   bot config

2. Set PAIRING_NUMBER (without +):
   PAIRING_NUMBER=6281234567890

3. Start the bot:
   bot start

Quick Commands:
  bot start     - Start bot
  bot stop      - Stop bot
  bot restart   - Restart bot
  bot log       - View logs
  bot status    - Check status
  bot update    - Update bot

For all commands type: bot

==========================================

EOF
}