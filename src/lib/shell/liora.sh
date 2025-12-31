#!/bin/bash

setup_liora() {
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
    
    print_info "Cloning Liora repository (branch: main)..."
    git clone --branch main --depth 1 "$REPO_URL" "$WORK_DIR" || {
        print_error "Failed to clone Liora repository"
        exit 1
    }
    
    cd "$WORK_DIR" || {
        print_error "Failed to change to Liora directory"
        exit 1
    }
    
    echo "main" > "$WORK_DIR/.current_version"
    print_success "Liora cloned successfully (branch: main)"
}

create_env_files() {
    print_info "Creating .env configuration files..."
    
    cat > "$WORK_DIR/.env" <<EOF
# ============================================
# LIORA BOT CONFIGURATION
# ============================================

# ============================================
# STAFF CONFIGURATION
# ============================================
# Format: ["lid1","lid2"]
# Use native WhatsApp LIDs, NOT phone numbers
# Example: ["113748182302861","227551947555018"]
OWNERS=[]

# ============================================
# PAIRING CONFIGURATION
# ============================================
# Phone number for pairing (country code without + or spaces)
# Example: 6283143663697
PAIRING_NUMBER=

# Custom pairing code (8 alphanumeric characters, auto-generated if empty)
# Example: ABCD1234
PAIRING_CODE=CUMICUMI

# ============================================
# BOT METADATA
# ============================================
WATERMARK=Liora
AUTHOR=Naruya Izumi
STICKPACK=Liora
STICKAUTH=© Naruya Izumi
THUMBNAIL_URL=https://qu.ax/DdwBH.jpg

# ============================================
# LOGGER CONFIGURATION
# ============================================
# Logging verbosity level
# Options: trace, debug, info, warn, error, fatal
LOG_LEVEL=info

# Enable pretty-printed log output (true/false)
LOG_PRETTY=true

# Enable colored log output (true/false)
LOG_COLORIZE=true

# Time format for log timestamps
LOG_TIME_FORMAT=HH:MM

# Log fields to exclude (comma-separated)
LOG_IGNORE=pid,hostname

# ============================================
# DATABASE CONFIGURATION
# ============================================
# IMPORTANT: Change these credentials before deployment!
# Format: postgresql://username:password@host:port/database
DATABASE_URL=postgresql://liora: naruyaizumi@localhost:5432/liora

# Connection pool settings
PG_POOL_SIZE=40
PG_POOL_TIMEOUT=30
PG_MAX_RETRIES=3

# ============================================
# REDIS CONFIGURATION
# ============================================
# Redis connection string with authentication
# Format: redis://[:password@]host:port[/database]
REDIS_URL=redis://localhost:6379

# Redis pool and timeout settings
REDIS_POOL_SIZE=25
REDIS_CONNECT_TIMEOUT=5000
REDIS_IDLE_TIMEOUT=30000
REDIS_MAX_RETRIES=5
REDIS_RETRY_DELAY=500

# ============================================
# CACHE CONFIGURATION
# ============================================
# Maximum number of items in memory cache
CACHE_MAX_SIZE=20000

# Time-to-live for different cache types (in seconds)
CACHE_TTL_SECS=3600
CHAT_CACHE_TTL=3600
GROUP_CACHE_TTL=1200
MESSAGE_CACHE_TTL=1800
CONTACT_CACHE_TTL=7200

# ============================================
# HTTP SERVER
# ============================================
# Local server binding (use 0.0.0.0 for external access)
HTTP_HOST=127.0.0.1
HTTP_PORT=8765

# ============================================
# SUPERVISOR
# ============================================
# Bot restart and crash management settings
MAX_CRASHES=10
CRASH_WINDOW_SECS=120
COOLDOWN_SECS=10
RESTART_DELAY_SECS=2
SHUTDOWN_TIMEOUT_SECS=8

# ============================================
# RUNTIME
# ============================================
# Logging level: trace, debug, info, warn, error
RUST_LOG=info

# Node environment: development, production, test
NODE_ENV=production

# Timezone for bot operations
TZ=Asia/Jakarta

# ============================================
# PERFORMANCE
# ============================================
# Concurrency and batching settings
MAX_CONCURRENT_OPS=30
BATCH_DELAY_MS=50
MAX_BATCH_RETRIES=3

# Cleanup intervals (in milliseconds)
CLEANUP_INTERVAL_MS=180000
PENDING_CLEANUP_INTERVAL_MS=180000

# ============================================
# CIRCUIT BREAKER
# ============================================
# Circuit breaker pattern for fault tolerance
CIRCUIT_BREAKER_THRESHOLD=10
CIRCUIT_BREAKER_TIMEOUT=30000

# ============================================
# HEALTH CHECK
# ============================================
# Health check interval (in milliseconds)
HEALTH_CHECK_INTERVAL=15000

# ============================================
# FEATURE FLAGS
# ============================================
# Enable/disable specific features
ENABLE_AUTO_PIPELINING=true
ENABLE_OFFLINE_QUEUE=true
ENABLE_HOT_RESTART=true

# ============================================
# SECURITY NOTES
# ============================================
# 1. Change DATABASE_URL credentials before production deployment
# 2. Add Redis password if Redis requires authentication
# 3. Keep this file out of version control (add to .gitignore)
# 4. Use environment-specific .env files (.env.production, .env.development)
# 5. Rotate credentials regularly
# 6. Restrict file permissions: chmod 600 .env
EOF

    print_success ".env file created at $WORK_DIR/.env"
    
    mkdir -p "$WORK_DIR/src/lib/rs"
    cat > "$WORK_DIR/src/lib/rs/.env" <<EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}
RUST_LOG=info
EOF

    print_success ".env file created at $WORK_DIR/src/lib/rs/.env"
}

install_liora_dependencies() {
    print_info "Installing Liora dependencies..."
    "$BUN_PATH" install || {
        print_error "Failed to install Liora dependencies"
        exit 1
    }
    
    print_success "Liora dependencies installed"
}

build_rust_supervisor() {
    print_info "Building Rust supervisor..."
    
    cd "${WORK_DIR}/src/lib/rs" || {
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
}