#!/bin/bash

get_latest_tag() {
    git ls-remote --tags --refs "$REPO_URL" | 
    grep -oP 'refs/tags/(v)?\d+\.\d+\.\d+$' | 
    sed 's|refs/tags/||' | 
    sort -V | 
    tail -1
}

clone_repository() {
    print_info "Cloning repository..."
    
    if [ -d "$WORK_DIR" ]; then
        print_warning "Directory exists, backing up..."
        systemctl stop "$SERVICE_NAME" 2>/dev/null || true
        mv "$WORK_DIR" "${WORK_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    LATEST_TAG=$(get_latest_tag)
    
    if [ -n "$LATEST_TAG" ]; then
        print_info "Installing version: $LATEST_TAG"
        git clone --branch "$LATEST_TAG" --depth 1 "$REPO_URL" "$WORK_DIR" || {
            print_error "Failed to clone repository"
            exit 1
        }
        echo "$LATEST_TAG" > "$WORK_DIR/.current_version"
    else
        print_info "Installing from main branch"
        git clone --branch main --depth 1 "$REPO_URL" "$WORK_DIR" || {
            print_error "Failed to clone repository"
            exit 1
        }
        echo "main" > "$WORK_DIR/.current_version"
    fi
    
    print_success "Repository cloned"
}

create_env_files() {
    print_info "Creating configuration files..."
    
    cat > "$WORK_DIR/.env" <<EOF
# ============================================
# STAFF CONFIGURATION
# ============================================
OWNERS=[]

# ============================================
# PAIRING CONFIGURATION
# ============================================
PAIRING_NUMBER=
PAIRING_CODE=CUMICUMI

# ============================================
# BOT METADATA
# ============================================
WATERMARK=Liora
AUTHOR=Naruya Izumi
THUMBNAIL_URL=https://qu.ax/DdwBH.jpg

# ============================================
# LOGGER CONFIGURATION
# ============================================
LOG_LEVEL=info
LOG_PRETTY=true
LOG_COLORIZE=true
LOG_TIME_FORMAT=HH:MM
LOG_IGNORE=pid,hostname

# ============================================
# DATABASE CONFIGURATION
# ============================================
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# ============================================
# REDIS CONFIGURATION
# ============================================
REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}
EOF

    print_success "Configuration files created"
}

install_dependencies() {
    print_info "Installing dependencies..."
    
    cd "$WORK_DIR" || exit 1
    "$BUN_PATH" install || {
        print_error "Failed to install dependencies"
        exit 1
    }
    
    print_success "Dependencies installed"
}

setup_environment() {
    clone_repository
    create_env_files
    install_dependencies
}