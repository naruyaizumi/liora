#!/bin/bash
# Dependencies Management - FIXED VERSION

detect_distro() {
    [ ! -f /etc/os-release ] && { error "Cannot detect OS"; exit 1; }
    
    . /etc/os-release
    export OS_ID="$ID"
    export OS_VERSION="${VERSION_ID:-unknown}"
    
    case "$OS_ID" in
        ubuntu|debian)
            export PKG_UPDATE="apt-get update -qq"
            export PKG_INSTALL="apt-get install -y -qq"
            export DEPS="git curl wget ca-certificates unzip ffmpeg"
            ;;
        centos|rhel|rocky|alma)
            export PKG_UPDATE="yum check-update || true"
            export PKG_INSTALL="yum install -y -q"
            export DEPS="git curl wget ca-certificates unzip ffmpeg"
            ;;
        fedora)
            export PKG_UPDATE="dnf check-update || true"
            export PKG_INSTALL="dnf install -y -q"
            export DEPS="git curl wget ca-certificates unzip ffmpeg"
            ;;
        *)
            warn "Unsupported distribution: $OS_ID"
            # FIX: Proper input redirect from terminal
            echo -n "Continue anyway? [y/N]: "
            read -r reply < /dev/tty
            [[ ! $reply =~ ^[Yy]$ ]] && exit 1
            export PKG_UPDATE="true"
            export PKG_INSTALL="echo"
            export DEPS=""
            ;;
    esac
    
    log "Detected: $OS_ID $OS_VERSION"
}

install_packages() {
    info "Installing system packages..."
    
    $PKG_UPDATE || {
        error "Failed to update package lists"
        exit 1
    }
    
    # FIX: Only install if DEPS not empty
    if [ -n "$DEPS" ]; then
        $PKG_INSTALL $DEPS || {
            error "Failed to install dependencies"
            exit 1
        }
    fi
    
    log "System packages installed"
}

install_bun() {
    info "Installing Bun runtime..."
    
    if [ -d "$HOME/.bun" ]; then
        info "Bun already installed, upgrading..."
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
        "$BUN_PATH" upgrade 2>/dev/null || true
    else
        curl -fsSL https://bun.sh/install | bash || {
            error "Failed to install Bun"
            exit 1
        }
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
    fi
    
    # FIX: Better verification
    if [ ! -f "$BUN_PATH" ]; then
        error "Bun binary not found at $BUN_PATH"
        exit 1
    fi
    
    if ! "$BUN_PATH" --version &>/dev/null; then
        error "Bun installation verification failed"
        exit 1
    fi
    
    export BUN_VERSION=$("$BUN_PATH" --version)
    log "Bun v$BUN_VERSION installed"
}

install_pm2() {
    # FIX: Check if already installed first
    if command -v pm2 &> /dev/null; then
        log "PM2 already installed"
        return 0
    fi
    
    info "Installing PM2..."
    
    # FIX: Verify bun is available first
    if [ ! -f "$BUN_PATH" ]; then
        error "Bun not found. Cannot install PM2."
        exit 1
    fi
    
    "$BUN_PATH" install -g pm2 || {
        error "Failed to install PM2"
        exit 1
    }
    
    # FIX: Verify PM2 installation
    if ! command -v pm2 &> /dev/null; then
        error "PM2 installation verification failed"
        exit 1
    fi
    
    log "PM2 installed successfully"
}

select_process_manager() {
    cat << "EOF"

Process Manager Selection
================================================================================
EOF
    echo "  1) systemd (recommended for production)"
    echo "  2) PM2 (Node.js process manager)"
    echo ""
    
    while true; do
        # FIX: Proper terminal input
        echo -n "Select [1-2]: "
        read -r choice < /dev/tty
        
        case "$choice" in
            1)
                export PROCESS_MANAGER="systemd"
                log "Selected: systemd"
                break
                ;;
            2)
                export PROCESS_MANAGER="pm2"
                log "Selected: PM2"
                install_pm2
                break
                ;;
            *)
                error "Invalid choice. Enter 1 or 2."
                ;;
        esac
    done
    echo ""
}

install_dependencies() {
    detect_distro
    install_packages
    install_bun
}