#!/bin/bash

detect_distro() {
    if [ ! -f /etc/os-release ]; then
        print_error "Cannot detect OS"
        exit 1
    fi
    
    . /etc/os-release
    OS_ID="$ID"
    
    case "$OS_ID" in
        ubuntu|debian|pop|linuxmint|elementary)
            PKG_UPDATE="apt-get update -qq"
            PKG_INSTALL="apt-get install -y"
            DEPS="ffmpeg build-essential python3 git curl wget ca-certificates postgresql-18 postgresql-contrib-18 redis-server"
            ;;
        arch|manjaro|endeavouros)
            PKG_UPDATE="pacman -Sy --noconfirm"
            PKG_INSTALL="pacman -S --noconfirm"
            DEPS="ffmpeg base-devel python git curl wget ca-certificates postgresql redis"
            ;;
        fedora|rhel|centos|rocky|almalinux)
            PKG_UPDATE="dnf check-update -y || true"
            PKG_INSTALL="dnf install -y"
            DEPS="ffmpeg-free gcc gcc-c++ make python3 git curl wget ca-certificates postgresql-server postgresql-contrib redis"
            ;;
        alpine)
            PKG_UPDATE="apk update"
            PKG_INSTALL="apk add"
            DEPS="ffmpeg build-base python3 git curl wget ca-certificates postgresql redis"
            ;;
        *)
            print_error "Unsupported distribution: $OS_ID"
            exit 1
            ;;
    esac
    
    print_success "Detected: $OS_ID"
}

install_system_packages() {
    print_info "Installing system packages..."
    
    $PKG_UPDATE || {
        print_error "Failed to update package lists"
        exit 1
    }
    
    $PKG_INSTALL $DEPS || {
        print_error "Failed to install dependencies"
        exit 1
    }
    
    if [[ "$OS_ID" =~ ^(fedora|rhel|centos|rocky|almalinux)$ ]]; then
        postgresql-setup --initdb 2>/dev/null || postgresql-setup initdb 2>/dev/null || true
    elif [[ "$OS_ID" =~ ^(arch|manjaro)$ ]]; then
        su - postgres -c "initdb -D /var/lib/postgres/data" 2>/dev/null || true
    fi
    
    print_success "System packages installed"
}

install_nodejs() {
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
}

install_bun() {
    print_info "Installing Bun..."
    
    if [ -d "$HOME/.bun" ]; then
        print_info "Bun already installed, upgrading..."
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
        "$BUN_PATH" upgrade 2>/dev/null || true
    else
        curl -fsSL https://bun.sh/install | bash || {
            print_error "Failed to install Bun"
            exit 1
        }
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
    fi
    
    if [ ! -f "$BUN_PATH" ] || ! "$BUN_PATH" --version &>/dev/null; then
        print_error "Bun installation failed"
        exit 1
    fi
    
    BUN_VERSION=$("$BUN_PATH" --version)
    print_success "Bun installed: $BUN_VERSION"
}

install_dependencies() {
    detect_distro
    install_system_packages
    install_nodejs
    install_bun
    setup_postgresql
    setup_redis
}
    print_info "Setting up PostgreSQL..."
    
    systemctl enable postgresql 2>/dev/null || systemctl enable postgresql.service 2>/dev/null || true
    systemctl start postgresql 2>/dev/null || systemctl start postgresql.service 2>/dev/null || true
    
    for i in {1..30}; do
        if sudo -u postgres psql -c "SELECT 1;" &>/dev/null; then
            break
        fi
        [ "$i" -eq 30 ] && { print_error "PostgreSQL timeout"; exit 1; }
        sleep 1
    done
    
    USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null || echo "0")
    if [ "$USER_EXISTS" != "1" ]; then
        sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || {
            print_error "Failed to create database user"
            exit 1
        }
    else
        sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || true
    fi
    
    DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "0")
    if [ "$DB_EXISTS" != "1" ]; then
        sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || {
            print_error "Failed to create database"
            exit 1
        }
    fi
    
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || true
    
    PG_HBA_CONF=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | tr -d '[:space:]')
    if [ -f "$PG_HBA_CONF" ]; then
        if ! grep -q "^host[[:space:]]*${DB_NAME}[[:space:]]*${DB_USER}" "$PG_HBA_CONF"; then
            echo "host    ${DB_NAME}    ${DB_USER}    127.0.0.1/32    md5" >> "$PG_HBA_CONF"
            systemctl reload postgresql 2>/dev/null || systemctl reload postgresql.service 2>/dev/null || true
            sleep 3
        fi
    fi
    
    export PGPASSWORD="$DB_PASSWORD"
    for i in {1..10}; do
        if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
            unset PGPASSWORD
            print_success "PostgreSQL configured"
            return 0
        fi
        sleep 2
    done
    
    unset PGPASSWORD
    print_error "Database connection failed"
    exit 1
}

setup_redis() {
    print_info "Setting up Redis..."
    
    REDIS_CONF=""
    for conf in /etc/redis/redis.conf /etc/redis.conf; do
        if [ -f "$conf" ]; then
            REDIS_CONF="$conf"
            break
        fi
    done
    
    if [ -n "$REDIS_CONF" ]; then
        sed -i 's/^maxmemory .*/maxmemory 256mb/' "$REDIS_CONF" 2>/dev/null || echo "maxmemory 256mb" >> "$REDIS_CONF"
        sed -i 's/^maxmemory-policy .*/maxmemory-policy allkeys-lru/' "$REDIS_CONF" 2>/dev/null || echo "maxmemory-policy allkeys-lru" >> "$REDIS_CONF"
    fi
    
    systemctl enable redis 2>/dev/null || systemctl enable redis-server 2>/dev/null || true
    systemctl restart redis 2>/dev/null || systemctl restart redis-server 2>/dev/null || true
    
    for i in {1..20}; do
        if redis-cli ping &>/dev/null; then
            print_success "Redis configured"
            return 0
        fi
        sleep 1
    done
    
    print_error "Redis connection failed"
    exit 1
}

install_dependencies() {
    detect_distro
    install_system_packages
    install_nodejs
    install_bun
    setup_postgresql
    setup_redis
}