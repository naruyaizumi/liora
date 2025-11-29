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
REPO_URL="https://github.com/naruyaizumi/liora.git"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

ERROR_ICON="☠️"
SUCCESS_ICON="🚀"
INFO_ICON="🍥"
WARNING_ICON="⚠️"

print_error() {
    echo -e "${RED}${ERROR_ICON} $1${NC}"
}

print_success() {
    echo -e "${GREEN}${SUCCESS_ICON} $1${NC}"
}

print_info() {
    echo -e "${YELLOW}${INFO_ICON} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${WARNING_ICON} $1${NC}"
}

cleanup_on_error() {
    print_error "Installation failed. Cleaning up..."
    
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    fi
    if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    fi
    
    rm -f "$SERVICE_FILE"
    rm -f "$HELPER_FILE"
    
    systemctl daemon-reload 2>/dev/null || true
    
    print_info "Cleanup completed. You can run the script again."
    exit 1
}

trap cleanup_on_error ERR

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

if [[ "$FFMPEG_VERSION" != "5" && "$FFMPEG_VERSION" != "6" && "$FFMPEG_VERSION" != "7" ]]; then
    print_error "FFmpeg version $FFMPEG_VERSION detected. Only version 5, 6, or 7 are supported."
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
NODE_PATH=$(which node)
NODE_DIR=$(dirname "$NODE_PATH")

if [ -z "$NODE_DIR" ] || [ ! -d "$NODE_DIR" ]; then
    print_error "Failed to determine Node.js directory"
    exit 1
fi

print_success "Node.js installed: $NODE_VERSION (npm: $NPM_VERSION) at $NODE_DIR"

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

print_info "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if systemctl is-active --quiet postgresql && sudo -u postgres psql -c "SELECT 1;" &>/dev/null; then
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "PostgreSQL failed to start or become ready"
        exit 1
    fi
    sleep 1
done

PG_VERSION=$(psql --version | awk '{print $3}' | cut -d. -f1)
print_success "PostgreSQL $PG_VERSION installed and running"

print_info "Setting up PostgreSQL database..."

USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")
if [ "$USER_EXISTS" != "1" ]; then
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || {
        print_error "Failed to create database user"
        exit 1
    }
    print_success "Database user '$DB_USER' created"
else
    print_info "User '$DB_USER' already exists, updating password..."
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || {
        print_error "Failed to update database user password"
        exit 1
    }
fi

DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")
if [ "$DB_EXISTS" = "1" ]; then
    print_info "Database '$DB_NAME' already exists"
else
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || {
        print_error "Failed to create database"
        exit 1
    }
    
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || {
        print_error "Failed to grant privileges"
        exit 1
    }
    
    print_success "Database '$DB_NAME' created successfully"
fi

print_info "Configuring PostgreSQL authentication..."

PG_HBA_CONF=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' | tr -d '[:space:]')

if [ -z "$PG_HBA_CONF" ]; then
    print_error "Failed to determine pg_hba.conf location"
    exit 1
fi

if [ -f "$PG_HBA_CONF" ]; then
    cp "$PG_HBA_CONF" "${PG_HBA_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    
    if ! grep -q "^host[[:space:]]*${DB_NAME}[[:space:]]*${DB_USER}[[:space:]]*127.0.0.1/32[[:space:]]*md5" "$PG_HBA_CONF"; then
        print_info "Adding authentication rule for database user..."
        echo "host    ${DB_NAME}    ${DB_USER}    127.0.0.1/32    md5" >> "$PG_HBA_CONF"
        
        systemctl reload postgresql || {
            print_error "Failed to reload PostgreSQL"
            exit 1
        }
        
        print_info "Waiting for PostgreSQL to apply new configuration..."
        sleep 5
        
        for i in {1..10}; do
            if sudo -u postgres psql -c "SELECT 1;" &>/dev/null; then
                break
            fi
            if [ $i -eq 10 ]; then
                print_error "PostgreSQL not responsive after reload"
                exit 1
            fi
            sleep 1
        done
    else
        print_info "Authentication rule already exists"
    fi
else
    print_error "pg_hba.conf not found at $PG_HBA_CONF"
    exit 1
fi

export PGPASSWORD="$DB_PASSWORD"
print_info "Testing database connection..."
CONNECTION_SUCCESS=false

for i in {1..15}; do
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
        print_success "Database connection test successful"
        CONNECTION_SUCCESS=true
        break
    fi
    if [ $i -lt 15 ]; then
        print_info "Retrying database connection (attempt $i/15)..."
        sleep 2
    fi
done

unset PGPASSWORD

if [ "$CONNECTION_SUCCESS" = false ]; then
    print_error "Database connection test failed after 15 attempts"
    print_info "Checking PostgreSQL logs..."
    journalctl -u postgresql -n 20 --no-pager
    exit 1
fi

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
    
    set_redis_config() {
        local key="$1"
        local value="$2"
        local pattern="$3"
        
        if grep -q "^${key}" "$REDIS_CONF"; then
            sed -i "s|^${key}.*|${key} ${value}|" "$REDIS_CONF"
        elif grep -q "^# *${pattern}" "$REDIS_CONF"; then
            sed -i "s|^# *${pattern}|${key} ${value}|" "$REDIS_CONF"
        else
            echo "${key} ${value}" >> "$REDIS_CONF"
        fi
    }
    
    set_redis_config "maxmemory" "256mb" "maxmemory <bytes>"
    set_redis_config "maxmemory-policy" "allkeys-lru" "maxmemory-policy noeviction"
    
    sed -i 's/^save 900 1/# save 900 1/' "$REDIS_CONF" 2>/dev/null || true
    sed -i 's/^save 300 10/# save 300 10/' "$REDIS_CONF" 2>/dev/null || true
    
    if ! grep -q "^save 60 10000" "$REDIS_CONF"; then
        sed -i 's/^# *save 60 10000/save 60 10000/' "$REDIS_CONF" 2>/dev/null || \
            echo "save 60 10000" >> "$REDIS_CONF"
    fi
    
    set_redis_config "appendonly" "yes" "appendonly no"
    set_redis_config "appendfsync" "everysec" "appendfsync everysec"
    
    print_success "Redis configuration updated"
else
    print_error "Redis configuration file not found at $REDIS_CONF"
    exit 1
fi

systemctl enable redis-server
systemctl restart redis-server

print_info "Waiting for Redis to be ready..."
for i in {1..30}; do
    if systemctl is-active --quiet redis-server && redis-cli ping &>/dev/null; then
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Redis failed to start"
        journalctl -u redis-server -n 20 --no-pager
        exit 1
    fi
    sleep 1
done

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
    source "$HOME/.cargo/env" 2>/dev/null || true
    rustup update stable 2>/dev/null || true
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
    "$BUN_PATH" upgrade 2>/dev/null || print_info "Bun upgrade skipped, continuing..."
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

print_info "Setting up Liora..."

if [ -d "$WORK_DIR" ]; then
    print_warning "Liora directory exists. Removing and reinstalling..."
    
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    fi
    
    BACKUP_DIR="${WORK_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    mv "$WORK_DIR" "$BACKUP_DIR"
    print_info "Old installation backed up to $BACKUP_DIR"
fi

print_info "Fetching latest release tag..."
LATEST_TAG=$(get_latest_release_tag)

if [ -z "$LATEST_TAG" ]; then
    print_warning "No release tag found, using main branch..."
    git clone "$REPO_URL" "$WORK_DIR" || {
        print_error "Failed to clone Liora repository"
        exit 1
    }
else
    print_success "Latest release tag: $LATEST_TAG"
    git clone --branch "$LATEST_TAG" --depth 1 "$REPO_URL" "$WORK_DIR" || {
        print_error "Failed to clone Liora repository at tag $LATEST_TAG"
        exit 1
    }
fi

cd "$WORK_DIR" || {
    print_error "Failed to change to Liora directory"
    exit 1
}

CURRENT_TAG=$(git describe --tags 2>/dev/null || echo "main")
echo "$CURRENT_TAG" > "$WORK_DIR/.current_version"

print_success "Liora cloned successfully (version: $CURRENT_TAG)"

print_info "Creating .env configuration files..."

cat > "$WORK_DIR/.env" <<EOF
# ============================================
# LIORA BOT CONFIG
# ============================================
# Format: [local_identifier]
# local_identifier: User's native LID, NOT phone number

# Notes:
# 1. Always use native LID from WhatsApp/WhiskeySocket to ensure consistency.
# 2. Do NOT use phone numbers, as JIDs can vary across environments.
OWNERS=["113748182302861","227551947555018"]

# WhatsApp pairing code (REQUIRED - Add your phone number here!)
PAIRING_NUMBER=

# WhatsApp group invite link for bot operations
GROUP_LINK=https://chat.whatsapp.com

# Sticker metadata (optional - leave empty for defaults)
WATERMARK=Liora
AUTHOR=Naruya Izumi
STICKPACK=Liora Stickers
STICKAUTH=Naruya Izumi

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

SERVICE_PATH="${BUN_INSTALL}/bin:${HOME}/.cargo/bin:${NODE_DIR}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

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

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

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
        echo -e "${RED}✗ Configuration file not found!${NC}"
        return 1
    fi
    
    local pairing_num
    pairing_num=$(grep "^PAIRING_NUMBER=" "$WORK_DIR/.env" | cut -d= -f2 | tr -d ' ')
    
    if [ -z "$pairing_num" ]; then
        echo -e "${RED}✗ PAIRING_NUMBER is empty in .env file!${NC}"
        echo -e "${YELLOW}Please configure your bot's phone number first:${NC}"
        echo -e "${CYAN}  nano $WORK_DIR/.env${NC}"
        echo -e "${YELLOW}or${NC}"
        echo -e "${CYAN}  vim $WORK_DIR/.env${NC}"
        echo ""
        echo -e "${YELLOW}Then add your phone number to PAIRING_NUMBER (without +)${NC}"
        echo -e "${YELLOW}Example: PAIRING_NUMBER=6281234567890${NC}"
        return 1
    fi
    
    return 0
}

case "$1" in
    log)
        echo -e "${YELLOW}Showing logs (Ctrl+C to exit)...${NC}"
        journalctl -u $SERVICE -f -o cat
        ;;
    start)
        if ! check_pairing_number; then
            exit 1
        fi
        echo -e "${BLUE}Starting bot...${NC}"
        systemctl start $SERVICE && echo -e "${GREEN}✓ Bot started!${NC}" || echo -e "${RED}✗ Failed to start bot${NC}"
        sleep 2
        systemctl status $SERVICE --no-pager -l
        ;;
    stop)
        echo -e "${BLUE}Stopping bot...${NC}"
        systemctl stop $SERVICE && echo -e "${GREEN}✓ Bot stopped!${NC}" || echo -e "${RED}✗ Failed to stop bot${NC}"
        ;;
    restart)
        if ! check_pairing_number; then
            exit 1
        fi
        echo -e "${BLUE}Restarting bot...${NC}"
        systemctl restart $SERVICE && echo -e "${GREEN}✓ Bot restarted!${NC}" || echo -e "${RED}✗ Failed to restart bot${NC}"
        sleep 2
        systemctl status $SERVICE --no-pager -l
        ;;
    status)
        systemctl status $SERVICE --no-pager -l
        ;;
    update)
        echo -e "${YELLOW}Checking for updates...${NC}"
        cd "$WORK_DIR" || { echo -e "${RED}✗ Failed to change directory${NC}"; exit 1; }
        
        if [ ! -d ".git" ]; then
            echo -e "${RED}✗ Not a git repository${NC}"
            exit 1
        fi
        
        CURRENT_VERSION=$(cat "$WORK_DIR/.current_version" 2>/dev/null || git describe --tags 2>/dev/null || echo "unknown")
        echo -e "${CYAN}Current version: ${CURRENT_VERSION}${NC}"
        
        git fetch --tags --quiet 2>/dev/null || { echo -e "${RED}✗ Failed to fetch updates${NC}"; exit 1; }
        
        LATEST_TAG=$(get_latest_release_tag)
        
        if [ -z "$LATEST_TAG" ]; then
            echo -e "${YELLOW}No release tags found, checking main branch...${NC}"
            
            CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
            LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null)
            REMOTE_HASH=$(git rev-parse origin/$CURRENT_BRANCH 2>/dev/null)
            
            if [ "$LOCAL_HASH" == "$REMOTE_HASH" ]; then
                echo -e "${GREEN}✓ Already up to date (branch: $CURRENT_BRANCH)${NC}"
                exit 0
            fi
            
            echo -e "${BLUE}Updates available on $CURRENT_BRANCH branch${NC}"
            
            if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
                echo -e "${BLUE}Stashing local changes...${NC}"
                git stash push -m "Auto-stash before update $(date +%Y%m%d_%H%M%S)" || {
                    echo -e "${RED}✗ Failed to stash changes${NC}"
                    exit 1
                }
            fi
            
            echo -e "${BLUE}Pulling latest changes...${NC}"
            git pull origin "$CURRENT_BRANCH" || { 
                echo -e "${RED}✗ Git pull failed${NC}"
                exit 1
            }
            
            echo "main" > "$WORK_DIR/.current_version"
        else
            echo -e "${CYAN}Latest release: ${LATEST_TAG}${NC}"
            
            if [ "$CURRENT_VERSION" == "$LATEST_TAG" ]; then
                echo -e "${GREEN}✓ Already up to date!${NC}"
                exit 0
            fi
            
            echo -e "${BLUE}New version available: ${LATEST_TAG}${NC}"
            echo -e "${YELLOW}Updating to ${LATEST_TAG}...${NC}"
            
            if systemctl is-active --quiet $SERVICE; then
                echo -e "${BLUE}Stopping service...${NC}"
                systemctl stop $SERVICE || { echo -e "${RED}✗ Failed to stop service${NC}"; exit 1; }
            fi
            
            if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
                echo -e "${BLUE}Stashing local changes...${NC}"
                git stash push -m "Auto-stash before update $(date +%Y%m%d_%H%M%S)" || {
                    echo -e "${RED}✗ Failed to stash changes${NC}"
                    exit 1
                }
            fi
            
            echo -e "${BLUE}Checking out version ${LATEST_TAG}...${NC}"
            git checkout "$LATEST_TAG" || {
                echo -e "${RED}✗ Failed to checkout version${NC}"
                exit 1
            }
            
            echo "$LATEST_TAG" > "$WORK_DIR/.current_version"
        fi
        
        echo -e "${BLUE}Installing dependencies...${NC}"
        "$BUN_PATH" install || { echo -e "${RED}✗ Dependency installation failed${NC}"; exit 1; }
        
        echo -e "${BLUE}Rebuilding Rust supervisor...${NC}"
        cd "${WORK_DIR}/lib/rs" || { echo -e "${RED}✗ Supervisor directory not found${NC}"; exit 1; }
        
        cargo clean 2>/dev/null || true
        
        cargo build --release || { echo -e "${RED}✗ Supervisor build failed${NC}"; exit 1; }
        
        if [ ! -f "$SUPERVISOR_PATH" ]; then
            echo -e "${RED}✗ Supervisor binary not found after build${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✓ Update completed successfully!${NC}"
        echo -e "${BLUE}Restarting service...${NC}"
        
        cd "$WORK_DIR" || exit 1
        systemctl restart $SERVICE && echo -e "${GREEN}✓ Bot updated and restarted!${NC}" || echo -e "${RED}✗ Failed to restart bot${NC}"
        sleep 2
        systemctl status $SERVICE --no-pager -l
        ;;
    logs)
        echo -e "${YELLOW}Showing last 100 log lines...${NC}"
        journalctl -u $SERVICE -n 100 --no-pager
        ;;
    rebuild)
        echo -e "${BLUE}Rebuilding Rust supervisor...${NC}"
        cd "${WORK_DIR}/lib/rs" || { echo -e "${RED}✗ Supervisor directory not found${NC}"; exit 1; }
        
        cargo clean 2>/dev/null || true
        
        cargo build --release || { echo -e "${RED}✗ Build failed${NC}"; exit 1; }
        
        if [ ! -f "$SUPERVISOR_PATH" ]; then
            echo -e "${RED}✗ Supervisor binary not found after build${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✓ Supervisor rebuilt successfully${NC}"
        echo -e "${YELLOW}Restart service to use new binary: bot restart${NC}"
        ;;
    config)
        echo -e "${CYAN}Opening configuration file...${NC}"
        if command -v nano &> /dev/null; then
            nano "$WORK_DIR/.env"
        elif command -v vim &> /dev/null; then
            vim "$WORK_DIR/.env"
        elif command -v vi &> /dev/null; then
            vi "$WORK_DIR/.env"
        else
            echo -e "${RED}✗ No text editor found (nano, vim, or vi)${NC}"
            echo -e "${YELLOW}Install one with: apt install nano${NC}"
            exit 1
        fi
        ;;
    version)
        if [ -f "$WORK_DIR/.current_version" ]; then
            CURRENT_VERSION=$(cat "$WORK_DIR/.current_version")
            echo -e "${CYAN}Current version: ${GREEN}${CURRENT_VERSION}${NC}"
        else
            echo -e "${YELLOW}Version file not found${NC}"
        fi
        
        LATEST_TAG=$(get_latest_release_tag)
        if [ -n "$LATEST_TAG" ]; then
            echo -e "${CYAN}Latest release: ${GREEN}${LATEST_TAG}${NC}"
        fi
        ;;
    check-config)
        if check_pairing_number; then
            echo -e "${GREEN}✓ Configuration is valid${NC}"
        else
            echo -e "${RED}✗ Configuration is invalid${NC}"
            exit 1
        fi
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
        echo ""
        echo -e "${YELLOW}Test Connection:${NC}"
        export PGPASSWORD="naruyaizumi"
        if psql -h localhost -U liora -d liora -c "SELECT 1;" &>/dev/null; then
            echo -e "${GREEN}✓ Database connection successful${NC}"
        else
            echo -e "${RED}✗ Database connection failed${NC}"
        fi
        unset PGPASSWORD
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
        if redis-cli ping &>/dev/null; then
            echo -e "${GREEN}✓ Redis is responding (PONG)${NC}"
            echo ""
            echo -e "${CYAN}Redis Info:${NC}"
            redis-cli info server | grep -E "redis_version|uptime_in_seconds" | head -2
        else
            echo -e "${RED}✗ Redis is not responding${NC}"
        fi
        ;;
    health)
        echo -e "${CYAN}════════════════════════════════════════${NC}"
        echo -e "${CYAN}        System Health Check${NC}"
        echo -e "${CYAN}════════════════════════════════════════${NC}"
        echo ""
        echo -e "${YELLOW}PostgreSQL:${NC}"
        if systemctl is-active --quiet postgresql; then
            echo -e "${GREEN}  ✓ Service Running${NC}"
            if sudo -u postgres psql -c "SELECT 1;" &>/dev/null; then
                echo -e "${GREEN}  ✓ Database Responsive${NC}"
            else
                echo -e "${RED}  ✗ Database Not Responsive${NC}"
            fi
        else
            echo -e "${RED}  ✗ Service Not Running${NC}"
        fi
        echo ""
        echo -e "${YELLOW}Redis:${NC}"
        if systemctl is-active --quiet redis-server; then
            echo -e "${GREEN}  ✓ Service Running${NC}"
            if redis-cli ping &>/dev/null; then
                echo -e "${GREEN}  ✓ Redis Responsive${NC}"
            else
                echo -e "${RED}  ✗ Redis Not Responsive${NC}"
            fi
        else
            echo -e "${RED}  ✗ Service Not Running${NC}"
        fi
        echo ""
        echo -e "${YELLOW}Liora Bot:${NC}"
        if systemctl is-active --quiet $SERVICE; then
            echo -e "${GREEN}  ✓ Service Running${NC}"
            if [ -f "$SUPERVISOR_PATH" ]; then
                echo -e "${GREEN}  ✓ Supervisor Binary Present${NC}"
            else
                echo -e "${RED}  ✗ Supervisor Binary Missing${NC}"
            fi
            if check_pairing_number &>/dev/null; then
                echo -e "${GREEN}  ✓ Configuration Valid${NC}"
            else
                echo -e "${RED}  ✗ Configuration Invalid (PAIRING_NUMBER empty)${NC}"
            fi
        else
            echo -e "${RED}  ✗ Service Not Running${NC}"
        fi
        echo ""
        echo -e "${YELLOW}Disk Space:${NC}"
        df -h "$WORK_DIR" | tail -1 | awk '{print "  Used: "$3" / "$2" ("$5")"}'
        echo ""
        ;;
    clean)
        echo -e "${YELLOW}⚠️  This will clean build artifacts and caches${NC}"
        echo -e "${YELLOW}Are you sure? (yes/no)${NC}"
        read -r confirmation
        if [[ "$confirmation" != "yes" ]]; then
            echo -e "${BLUE}Cancelled${NC}"
            exit 0
        fi
        
        echo -e "${BLUE}Stopping service...${NC}"
        systemctl stop $SERVICE 2>/dev/null || true
        
        echo -e "${BLUE}Cleaning Rust build artifacts...${NC}"
        cd "${WORK_DIR}/lib/rs" || { echo -e "${RED}✗ Directory not found${NC}"; exit 1; }
        cargo clean || echo -e "${YELLOW}Warning: cargo clean failed${NC}"
        
        echo -e "${BLUE}Cleaning node modules...${NC}"
        cd "$WORK_DIR" || exit 1
        rm -rf node_modules .bun-cache 2>/dev/null || true
        
        echo -e "${GREEN}✓ Cleanup completed${NC}"
        echo -e "${YELLOW}Run 'bot rebuild' to rebuild the supervisor${NC}"
        ;;
    reinstall)
        echo -e "${RED}⚠️  WARNING: This will completely reinstall Liora!${NC}"
        echo -e "${YELLOW}Your .env configuration will be backed up.${NC}"
        echo -e "${YELLOW}Are you sure? Type 'YES' to confirm:${NC}"
        read -r confirmation
        if [[ "$confirmation" != "YES" ]]; then
            echo -e "${BLUE}Cancelled${NC}"
            exit 0
        fi
        
        echo -e "${BLUE}Stopping service...${NC}"
        systemctl stop $SERVICE 2>/dev/null || true
        
        if [ -f "$WORK_DIR/.env" ]; then
            BACKUP_ENV="/root/.env.backup.$(date +%Y%m%d_%H%M%S)"
            cp "$WORK_DIR/.env" "$BACKUP_ENV"
            echo -e "${GREEN}✓ Configuration backed up to $BACKUP_ENV${NC}"
        fi
        
        echo -e "${BLUE}Removing old installation...${NC}"
        BACKUP_DIR="/root/liora.backup.$(date +%Y%m%d_%H%M%S)"
        mv "$WORK_DIR" "$BACKUP_DIR" 2>/dev/null || rm -rf "$WORK_DIR"
        
        echo -e "${BLUE}Cloning latest version...${NC}"
        LATEST_TAG=$(get_latest_release_tag)
        
        if [ -z "$LATEST_TAG" ]; then
            git clone "$REPO_URL" "$WORK_DIR" || { echo -e "${RED}✗ Clone failed${NC}"; exit 1; }
        else
            git clone --branch "$LATEST_TAG" --depth 1 "$REPO_URL" "$WORK_DIR" || { 
                echo -e "${RED}✗ Clone failed${NC}"
                exit 1
            }
            echo "$LATEST_TAG" > "$WORK_DIR/.current_version"
        fi
        
        cd "$WORK_DIR" || { echo -e "${RED}✗ Failed to change directory${NC}"; exit 1; }
        
        if [ -f "$BACKUP_ENV" ]; then
            cp "$BACKUP_ENV" "$WORK_DIR/.env"
            echo -e "${GREEN}✓ Configuration restored${NC}"
        fi
        
        echo -e "${BLUE}Installing dependencies...${NC}"
        "$BUN_PATH" install || { echo -e "${RED}✗ Installation failed${NC}"; exit 1; }
        
        echo -e "${BLUE}Building supervisor...${NC}"
        cd "${WORK_DIR}/lib/rs" || { echo -e "${RED}✗ Directory not found${NC}"; exit 1; }
        cargo build --release || { echo -e "${RED}✗ Build failed${NC}"; exit 1; }
        
        echo -e "${GREEN}✓ Reinstallation completed!${NC}"
        echo -e "${YELLOW}Don't forget to configure PAIRING_NUMBER: bot config${NC}"
        ;;
    *)
        echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
        echo -e "${BLUE}║   Liora Bot Management CLI             ║${NC}"
        echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${CYAN}Service Management:${NC}"
        echo -e "  ${GREEN}bot start${NC}        - Start the bot"
        echo -e "  ${GREEN}bot stop${NC}         - Stop the bot"
        echo -e "  ${GREEN}bot restart${NC}      - Restart the bot"
        echo -e "  ${GREEN}bot status${NC}       - Show service status"
        echo ""
        echo -e "${CYAN}Configuration:${NC}"
        echo -e "  ${GREEN}bot config${NC}       - Edit configuration file (.env)"
        echo -e "  ${GREEN}bot check-config${NC} - Validate configuration"
        echo ""
        echo -e "${CYAN}Logging:${NC}"
        echo -e "  ${GREEN}bot log${NC}          - Show real-time logs (live)"
        echo -e "  ${GREEN}bot logs${NC}         - Show last 100 log entries"
        echo ""
        echo -e "${CYAN}Updates & Maintenance:${NC}"
        echo -e "  ${GREEN}bot update${NC}       - Check and install updates"
        echo -e "  ${GREEN}bot version${NC}      - Show current and latest version"
        echo -e "  ${GREEN}bot rebuild${NC}      - Rebuild Rust supervisor only"
        echo -e "  ${GREEN}bot clean${NC}        - Clean build artifacts and caches"
        echo -e "  ${GREEN}bot reinstall${NC}    - Complete reinstall (preserves config)"
        echo ""
        echo -e "${CYAN}Information:${NC}"
        echo -e "  ${GREEN}bot db-info${NC}      - Show database connection info"
        echo -e "  ${GREEN}bot redis-info${NC}   - Show Redis connection info"
        echo -e "  ${GREEN}bot health${NC}       - Check system health"
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
if [ -n "$LATEST_TAG" ]; then
    echo -e "  ${BLUE}Liora Version:${NC} $LATEST_TAG"
else
    echo -e "  ${BLUE}Liora Version:${NC} main (development)"
fi
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
echo -e "${RED}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║  ⚠️  IMPORTANT: CONFIGURE YOUR BOT NUMBER!        ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Before starting the bot, you MUST add your phone number:${NC}"
echo ""
echo -e "${CYAN}1. Edit configuration file:${NC}"
echo -e "   ${GREEN}bot config${NC}"
echo -e "   ${BLUE}or${NC}"
echo -e "   ${GREEN}nano $WORK_DIR/.env${NC}"
echo ""
echo -e "${CYAN}2. Find this line:${NC}"
echo -e "   ${YELLOW}PAIRING_NUMBER=${NC}"
echo ""
echo -e "${CYAN}3. Add your phone number (without +):${NC}"
echo -e "   ${GREEN}PAIRING_NUMBER=6281234567890${NC}"
echo ""
echo -e "${CYAN}4. Save and exit (Ctrl+X, then Y, then Enter for nano)${NC}"
echo ""
echo -e "${CYAN}5. Verify your configuration:${NC}"
echo -e "   ${GREEN}bot check-config${NC}"
echo ""
echo -e "${CYAN}6. Start the bot:${NC}"
echo -e "   ${GREEN}bot start${NC}"
echo ""
echo -e "${BLUE}Quick commands reference:${NC}"
echo -e "  ${GREEN}bot config${NC}       - Edit bot configuration"
echo -e "  ${GREEN}bot check-config${NC} - Verify configuration is valid"
echo -e "  ${GREEN}bot start${NC}        - Start the bot"
echo -e "  ${GREEN}bot log${NC}          - View live logs"
echo -e "  ${GREEN}bot status${NC}       - Check service status"
echo -e "  ${GREEN}bot update${NC}       - Check for updates"
echo -e "  ${GREEN}bot health${NC}       - Check system health"
echo ""
echo -e "${YELLOW}${INFO_ICON} All services are configured to start automatically on boot${NC}"
echo -e "${YELLOW}${INFO_ICON} Type 'bot' to see all available commands${NC}"
echo ""