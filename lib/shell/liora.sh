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
}

create_env_files() {
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
}