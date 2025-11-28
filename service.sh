#!/bin/bash

set -e

SERVICE_NAME="liora"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
HELPER_FILE="/usr/local/bin/bot"
WORK_DIR="/root/liora"
BUN_PATH="/root/.bun/bin/bun"
SUPERVISOR_PATH="${WORK_DIR}/lib/rs/target/release/liora-rs"
TIME_ZONE="Asia/Jakarta"
DB_NAME="liora"
DB_USER="liora"
DB_PASSWORD="naruyaizumi"
DB_HOST="localhost"
DB_PORT="5432"
REDIS_HOST="localhost"
REDIS_PORT="6379"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERROR_ICON="☠️"
SUCCESS_ICON="🚀"
INFO_ICON="🍥"

print_error() {
    echo -e "${RED}${ERROR_ICON} $1${NC}"
}

print_success() {
    echo -e "${GREEN}${SUCCESS_ICON} $1${NC}"
}

print_info() {
    echo -e "${YELLOW}${INFO_ICON} $1${NC}"
}

cleanup_on_error() {
    print_error "Installation failed. Cleaning up..."
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    rm -f "$SERVICE_FILE"
    rm -f "$HELPER_FILE"
    exit 1
}

trap cleanup_on_error ERR

print_info "Validating OS compatibility..."

if [ ! -f /etc/os-release ]; then
    print_error "Cannot detect OS. /etc/os-release not found."
    exit 1
fi

OS_ID=$(grep '^ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
OS_VERSION_ID=$(grep '^VERSION_ID=' /etc/os-release | cut -d= -f2 | tr -d '"')

if [[ "$OS_ID" != "ubuntu" && "$OS_ID" != "debian" ]]; then
    print_error "Unsupported OS: $OS_ID. Only Ubuntu 24.04 or Debian 12 are supported."
    exit 1
fi

if [[ "$OS_ID" == "ubuntu" && "$OS_VERSION_ID" != "24.04" ]]; then
    print_error "Ubuntu version $OS_VERSION_ID is not supported. Use Ubuntu 24.04."
    exit 1
fi

if [[ "$OS_ID" == "debian" && "$OS_VERSION_ID" != "12" ]]; then
    print_error "Debian version $OS_VERSION_ID is not supported. Use Debian 12."
    exit 1
fi

print_success "OS validation passed: $OS_ID $OS_VERSION_ID"

print_info "Installing system dependencies..."

apt-get update -qq || {
    print_error "Failed to update package lists"
    exit 1
}

apt-get install -y \
    ffmpeg libwebp-dev libavformat-dev \
    libavcodec-dev libavutil-dev libswresample-dev \
    libswscale-dev libavfilter-dev build-essential \
    python3 g++ pkg-config \
    cmake git curl unzip wget ca-certificates gnupg lsb-release || {
    print_error "Failed to install system dependencies"
    exit 1
}

print_success "System dependencies installed"

print_info "Validating FFmpeg version..."

if ! command -v ffmpeg &> /dev/null; then
    print_error "FFmpeg not found after installation"
    exit 1
fi

FFMPEG_VERSION=$(ffmpeg -version | head -n1 | awk '{print $3}' | cut -d. -f1)

if [[ "$FFMPEG_VERSION" != "5" && "$FFMPEG_VERSION" != "6" ]]; then
    print_error "FFmpeg version $FFMPEG_VERSION detected. Only version 5 or 6 are supported."
    exit 1
fi

print_success "FFmpeg version $FFMPEG_VERSION detected"

print_info "Installing Node.js via NVM..."

export NVM_DIR="$HOME/.nvm"

if [ ! -d "$NVM_DIR" ]; then
    print_info "NVM not found, installing..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash || {
        print_error "Failed to install NVM"
        exit 1
    }
else
    print_info "NVM already installed"
fi

[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

if ! command -v nvm &> /dev/null; then
    print_error "NVM failed to load"
    exit 1
fi

print_info "Installing Node.js v24..."
nvm install 24 || {
    print_error "Failed to install Node.js"
    exit 1
}

nvm use 24
nvm alias default 24

if ! command -v node &> /dev/null; then
    print_error "Node.js installation failed"
    exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
print_success "Node.js installed: $NODE_VERSION (npm: $NPM_VERSION)"

print_info "Installing PostgreSQL..."

if command -v psql &> /dev/null; then
    print_info "PostgreSQL already installed"
else
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    
    apt-get update -qq
    apt-get install -y postgresql-16 postgresql-contrib-16 || {
        print_error "Failed to install PostgreSQL"
        exit 1
    }
fi

systemctl enable postgresql
systemctl start postgresql

if ! systemctl is-active --quiet postgresql; then
    print_error "PostgreSQL failed to start"
    exit 1
fi

PG_VERSION=$(psql --version | awk '{print $3}' | cut -d. -f1)
print_success "PostgreSQL $PG_VERSION installed and running"

print_info "Setting up PostgreSQL database..."

DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" = "1" ]; then
    print_info "Database '$DB_NAME' already exists"
else
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || {
        print_info "User '$DB_USER' already exists, updating password..."
        sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    }
    
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || {
        print_error "Failed to create database"
        exit 1
    }
    
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    
    print_success "Database '$DB_NAME' created successfully"
fi

export PGPASSWORD="$DB_PASSWORD"
if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
    print_success "Database connection test successful"
else
    print_error "Database connection test failed"
    exit 1
fi
unset PGPASSWORD

print_info "Installing Redis..."

if command -v redis-server &> /dev/null; then
    print_info "Redis already installed"
else
    apt-get install -y redis-server || {
        print_error "Failed to install Redis"
        exit 1
    }
fi

print_info "Configuring Redis..."
REDIS_CONF="/etc/redis/redis.conf"

if [ -f "$REDIS_CONF" ]; then
    cp "$REDIS_CONF" "${REDIS_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    
    sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' "$REDIS_CONF"
    sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' "$REDIS_CONF"
    sed -i 's/^save 900 1/# save 900 1/' "$REDIS_CONF"
    sed -i 's/^save 300 10/# save 300 10/' "$REDIS_CONF"
    sed -i 's/^save 60 10000/save 60 10000/' "$REDIS_CONF"
    
    sed -i 's/^appendonly no/appendonly yes/' "$REDIS_CONF"
    sed -i 's/^# appendfsync everysec/appendfsync everysec/' "$REDIS_CONF"
fi

systemctl enable redis-server
systemctl restart redis-server

if ! systemctl is-active --quiet redis-server; then
    print_error "Redis failed to start"
    exit 1
fi

if redis-cli ping | grep -q "PONG"; then
    print_success "Redis installed and running"
else
    print_error "Redis connection test failed"
    exit 1
fi

REDIS_VERSION=$(redis-server --version | awk '{print $3}' | cut -d= -f2)
print_success "Redis $REDIS_VERSION installed successfully"

print_info "Installing Rust toolchain..."

if ! command -v rustc &> /dev/null; then
    print_info "Rust not found, installing..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y || {
        print_error "Failed to install Rust"
        exit 1
    }
    source "$HOME/.cargo/env"
else
    print_info "Rust already installed, ensuring latest stable..."
    rustup update stable
fi

if ! command -v cargo &> /dev/null; then
    print_error "Cargo not found after Rust installation"
    exit 1
fi

RUST_VERSION=$(rustc --version | awk '{print $2}')
print_success "Rust installed successfully (version: $RUST_VERSION)"

print_info "Installing Bun..."

if [ -d "$HOME/.bun" ]; then
    print_info "Bun already installed, upgrading..."
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
else
    curl -fsSL https://bun.sh/install | bash || {
        print_error "Failed to install Bun"
        exit 1
    }
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

if [ ! -f "$BUN_PATH" ]; then
    print_error "Bun installation failed - executable not found at $BUN_PATH"
    exit 1
fi

if ! "$BUN_PATH" --version &>/dev/null; then
    print_error "Bun installation failed - cannot execute bun"
    exit 1
fi

BUN_VERSION=$("$BUN_PATH" --version)
print_success "Bun installed successfully (version: $BUN_VERSION)"

print_info "Upgrading Bun to latest version..."
"$BUN_PATH" upgrade || print_info "Bun upgrade failed, continuing with current version..."

print_info "Setting up Liora..."

if [ -d "$WORK_DIR" ]; then
    print_info "Liora directory exists. Updating..."
    cd "$WORK_DIR" || {
        print_error "Failed to change to Liora directory"
        exit 1
    }
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    git stash push -m "Auto-stash before update $(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    git pull origin "$CURRENT_BRANCH" || {
        print_error "Failed to update Liora repository"
        exit 1
    }
else
    print_info "Cloning Liora repository..."
    git clone https://github.com/naruyaizumi/liora.git "$WORK_DIR" || {
        print_error "Failed to clone Liora repository"
        exit 1
    }
    cd "$WORK_DIR" || {
        print_error "Failed to change to Liora directory"
        exit 1
    }
fi

print_info "Creating .env configuration files..."

cat > "$WORK_DIR/.env" <<EOF
# ============================================
# DATABASE CONFIGURATION
# ============================================
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# PostgreSQL Connection Pool
PG_POOL_SIZE=40
PG_POOL_TIMEOUT=30
PG_MAX_RETRIES=3

# ============================================
# REDIS CONFIGURATION
# ============================================
REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}

# Redis Connection Pool
REDIS_POOL_SIZE=25
REDIS_CONNECT_TIMEOUT=5000
REDIS_IDLE_TIMEOUT=30000
REDIS_MAX_RETRIES=5
REDIS_RETRY_DELAY=500

# ============================================
# CACHE CONFIGURATION
# ============================================
CACHE_MAX_SIZE=20000
CACHE_TTL_SECS=3600

# Cache TTL per type (in seconds)
CHAT_CACHE_TTL=3600
GROUP_CACHE_TTL=1200
MESSAGE_CACHE_TTL=1800
CONTACT_CACHE_TTL=7200

# ============================================
# HTTP SERVER CONFIGURATION
# ============================================
HTTP_HOST=127.0.0.1
HTTP_PORT=8765

# ============================================
# SUPERVISOR CONFIGURATION
# ============================================
MAX_CRASHES=10
CRASH_WINDOW_SECS=120
COOLDOWN_SECS=10
RESTART_DELAY_SECS=2
SHUTDOWN_TIMEOUT_SECS=8

# ============================================
# RUNTIME CONFIGURATION
# ============================================
RUST_LOG=info
NODE_ENV=production
TZ=${TIME_ZONE}

# ============================================
# PERFORMANCE TUNING
# ============================================
MAX_CONCURRENT_OPS=30
BATCH_DELAY_MS=50
MAX_BATCH_RETRIES=3

# Cleanup intervals (milliseconds)
CLEANUP_INTERVAL_MS=180000
PENDING_CLEANUP_INTERVAL_MS=180000

# ============================================
# CIRCUIT BREAKER CONFIGURATION
# ============================================
CIRCUIT_BREAKER_THRESHOLD=10
CIRCUIT_BREAKER_TIMEOUT=30000

# ============================================
# HEALTH CHECKS
# ============================================
HEALTH_CHECK_INTERVAL=15000

# ============================================
# FEATURE FLAGS
# ============================================
ENABLE_AUTO_PIPELINING=true
ENABLE_OFFLINE_QUEUE=true
ENABLE_HOT_RESTART=true
EOF

print_success ".env file created at $WORK_DIR/.env"

mkdir -p "$WORK_DIR/lib/rs"
cat > "$WORK_DIR/lib/rs/.env" <<EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}
RUST_LOG=info
EOF

print_success ".env file created at $WORK_DIR/lib/rs/.env"

print_info "Installing Liora dependencies..."
"$BUN_PATH" install || {
    print_error "Failed to install Liora dependencies"
    exit 1
}

print_success "Liora dependencies installed"

print_info "Building Rust supervisor..."

cd "${WORK_DIR}/lib/rs" || {
    print_error "Supervisor directory not found"
    exit 1
}

cargo build --release || {
    print_error "Failed to build Rust supervisor"
    exit 1
}

if [ ! -f "$SUPERVISOR_PATH" ]; then
    print_error "Supervisor binary not found after build"
    exit 1
fi

print_success "Rust supervisor built successfully"

cd "$WORK_DIR" || exit 1

print_success "Liora setup completed"

print_info "Creating systemd service..."

cat > "$SERVICE_FILE" <<EOL
[Unit]
Description=Liora WhatsApp Bot
After=network-online.target systemd-resolved.service postgresql.service redis-server.service
Wants=network-online.target systemd-resolved.service
Requires=postgresql.service redis-server.service
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=root
WorkingDirectory=${WORK_DIR}
ExecStart=${SUPERVISOR_PATH}
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
Environment=PATH=${BUN_INSTALL}/bin:${HOME}/.cargo/bin:${NVM_DIR}/versions/node/v24.11.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
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

print_info "Creating helper CLI tool..."

cat > "$HELPER_FILE" <<'EOFHELPER'
#!/bin/bash

SERVICE="liora"
WORK_DIR="/root/liora"
BUN_PATH="/root/.bun/bin/bun"
SUPERVISOR_PATH="${WORK_DIR}/lib/rs/target/release/liora-rs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

case "$1" in
    log)
        echo -e "${YELLOW}Showing logs (Ctrl+C to exit)...${NC}"
        journalctl -u $SERVICE -f -o cat
        ;;
    start)
        echo -e "${BLUE}Starting bot...${NC}"
        systemctl start $SERVICE && echo -e "${GREEN}Bot started!${NC}" || echo -e "${RED}Failed to start bot${NC}"
        ;;
    stop)
        echo -e "${BLUE}Stopping bot...${NC}"
        systemctl stop $SERVICE && echo -e "${GREEN}Bot stopped!${NC}" || echo -e "${RED}Failed to stop bot${NC}"
        ;;
    restart)
        echo -e "${BLUE}Restarting bot...${NC}"
        systemctl restart $SERVICE && echo -e "${GREEN}Bot restarted!${NC}" || echo -e "${RED}Failed to restart bot${NC}"
        ;;
    status)
        systemctl status $SERVICE --no-pager
        ;;
    update)
        echo -e "${YELLOW}Updating Liora...${NC}"
        cd "$WORK_DIR" || { echo -e "${RED}Failed to change directory${NC}"; exit 1; }
        CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
        git stash push -m "Auto-stash before update $(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
        git pull origin "$CURRENT_BRANCH" || { echo -e "${RED}Git pull failed${NC}"; exit 1; }
        "$BUN_PATH" install || { echo -e "${RED}Dependency installation failed${NC}"; exit 1; }
        echo -e "${BLUE}Rebuilding Rust supervisor...${NC}"
        cd "${WORK_DIR}/lib/rs" || { echo -e "${RED}Supervisor directory not found${NC}"; exit 1; }
        cargo build --release || { echo -e "${RED}Supervisor build failed${NC}"; exit 1; }
        echo -e "${GREEN}Supervisor rebuilt successfully${NC}"
        systemctl restart $SERVICE && echo -e "${GREEN}Bot updated and restarted!${NC}" || echo -e "${RED}Failed to restart bot${NC}"
        ;;
    logs)
        echo -e "${YELLOW}Showing last 100 log lines...${NC}"
        journalctl -u $SERVICE -n 100 --no-pager
        ;;
    rebuild)
        echo -e "${BLUE}Rebuilding Rust supervisor...${NC}"
        cd "${WORK_DIR}/lib/rs" || { echo -e "${RED}Supervisor directory not found${NC}"; exit 1; }
        cargo build --release || { echo -e "${RED}Build failed${NC}"; exit 1; }
        echo -e "${GREEN}Supervisor rebuilt successfully${NC}"
        echo -e "${YELLOW}Restart service to use new binary: bot restart${NC}"
        ;;
    db-info)
        echo -e "${CYAN}Database Information:${NC}"
        echo -e "  Database: liora"
        echo -e "  User: liora"
        echo -e "  Password: naruyaizumi"
        echo -e "  Host: localhost"
        echo -e "  Port: 5432"
        echo ""
        echo -e "${CYAN}Connection String:${NC}"
        echo -e "  postgresql://liora:naruyaizumi@localhost:5432/liora"
        ;;
    redis-info)
        echo -e "${CYAN}Redis Information:${NC}"
        echo -e "  Host: localhost"
        echo -e "  Port: 6379"
        echo ""
        echo -e "${CYAN}Connection String:${NC}"
        echo -e "  redis://localhost:6379"
        echo ""
        echo -e "${YELLOW}Redis Status:${NC}"
        redis-cli ping && echo -e "${GREEN}Redis is responding${NC}" || echo -e "${RED}Redis is not responding${NC}"
        ;;
    health)
        echo -e "${CYAN}System Health Check${NC}"
        echo ""
        echo -e "${YELLOW}PostgreSQL:${NC}"
        systemctl is-active postgresql && echo -e "${GREEN}✓ Running${NC}" || echo -e "${RED}✗ Not running${NC}"
        echo ""
        echo -e "${YELLOW}Redis:${NC}"
        systemctl is-active redis-server && echo -e "${GREEN}✓ Running${NC}" || echo -e "${RED}✗ Not running${NC}"
        echo ""
        echo -e "${YELLOW}Liora Bot:${NC}"
        systemctl is-active $SERVICE && echo -e "${GREEN}✓ Running${NC}" || echo -e "${RED}✗ Not running${NC}"
        ;;
    *)
        echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
        echo -e "${BLUE}║   Liora Bot Management CLI             ║${NC}"
        echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${CYAN}Service Management:${NC}"
        echo -e "  ${GREEN}bot start${NC}     - Start the bot"
        echo -e "  ${GREEN}bot stop${NC}      - Stop the bot"
        echo -e "  ${GREEN}bot restart${NC}   - Restart the bot"
        echo -e "  ${GREEN}bot status${NC}    - Show service status"
        echo ""
        echo -e "${CYAN}Logging:${NC}"
        echo -e "  ${GREEN}bot log${NC}       - Show real-time logs (live)"
        echo -e "  ${GREEN}bot logs${NC}      - Show last 100 log entries"
        echo ""
        echo -e "${CYAN}Maintenance:${NC}"
        echo -e "  ${GREEN}bot update${NC}    - Update from git, rebuild, and restart"
        echo -e "  ${GREEN}bot rebuild${NC}   - Rebuild Rust supervisor only"
        echo ""
        echo -e "${CYAN}Information:${NC}"
        echo -e "  ${GREEN}bot db-info${NC}   - Show database connection info"
        echo -e "  ${GREEN}bot redis-info${NC} - Show Redis connection info"
        echo -e "  ${GREEN}bot health${NC}    - Check system health"
        echo ""
        exit 1
        ;;
esac
EOFHELPER

chmod +x "$HELPER_FILE" || {
    print_error "Failed to make helper CLI executable"
    exit 1
}

print_success "Helper CLI created"

echo ""
echo -e "${GREEN}${SUCCESS_ICON}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${SUCCESS_ICON}║  Liora Bot Installation Complete!                 ║${NC}"
echo -e "${GREEN}${SUCCESS_ICON}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}System Information:${NC}"
echo -e "  ${BLUE}OS:${NC} $OS_ID $OS_VERSION_ID"
echo -e "  ${BLUE}Node.js:${NC} $NODE_VERSION"
echo -e "  ${BLUE}Bun:${NC} $BUN_VERSION"
echo -e "  ${BLUE}Rust:${NC} $RUST_VERSION"
echo -e "  ${BLUE}PostgreSQL:${NC} $PG_VERSION"
echo -e "  ${BLUE}Redis:${NC} $REDIS_VERSION"
echo -e "  ${BLUE}FFmpeg:${NC} $FFMPEG_VERSION"
echo ""
echo -e "${CYAN}Database Configuration:${NC}"
echo -e "  ${BLUE}Database:${NC} $DB_NAME"
echo -e "  ${BLUE}User:${NC} $DB_USER"
echo -e "  ${BLUE}Password:${NC} $DB_PASSWORD"
echo -e "  ${BLUE}Host:${NC} $DB_HOST:$DB_PORT"
echo ""
echo -e "${CYAN}Redis Configuration:${NC}"
echo -e "  ${BLUE}Host:${NC} $REDIS_HOST:$REDIS_PORT"
echo ""
echo -e "${CYAN}Architecture:${NC}"
echo -e "  ${YELLOW}${INFO_ICON} Parent Process:${NC} Rust Supervisor"
echo -e "  ${YELLOW}${INFO_ICON} Child Process:${NC} Bun + JavaScript"
echo ""
echo -e "${GREEN}${SUCCESS_ICON} Configuration files created:${NC}"
echo -e "  ${BLUE}•${NC} $WORK_DIR/.env"
echo -e "  ${BLUE}•${NC} $WORK_DIR/lib/rs/.env"
echo ""
echo -e "${BLUE}To start the bot:${NC}"
echo -e "  ${GREEN}bot restart${NC}"
echo ""
echo -e "${BLUE}Quick commands:${NC}"
echo -e "  ${GREEN}bot start${NC}      - Start the bot"
echo -e "  ${GREEN}bot stop${NC}       - Stop the bot"
echo -e "  ${GREEN}bot log${NC}        - View live logs"
echo -e "  ${GREEN}bot status${NC}     - Check service status"
echo -e "  ${GREEN}bot health${NC}     - Check system health"
echo -e "  ${GREEN}bot db-info${NC}    - View database info"
echo -e "  ${GREEN}bot redis-info${NC} - View Redis info"
echo ""
echo -e "${YELLOW}${INFO_ICON} Note: All services are configured to start on boot${NC}"
echo ""