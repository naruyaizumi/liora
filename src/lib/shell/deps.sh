#!/bin/bash
# Dependencies Management

detect_distro() {
    [ ! -f /etc/os-release ] && { error "Cannot detect operating system"; exit 1; }
    
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
            warn "Unsupported distribution: ${YELLOW}${OS_ID}${RESET}"
            echo -e "${GRAY}────────────────────────────────────────────────────────────────────────────${RESET}"
            echo -e "${WHITE}Only Ubuntu, Debian, CentOS, RHEL, Rocky, AlmaLinux, and Fedora are${RESET}"
            echo -e "${WHITE}officially supported. Installation may not work correctly.${RESET}"
            echo -e "${GRAY}────────────────────────────────────────────────────────────────────────────${RESET}"
            echo ""
            echo -n "Continue anyway? [y/N]: "
            read -r reply < /dev/tty
            [[ ! $reply =~ ^[Yy]$ ]] && exit 1
            export PKG_UPDATE="true"
            export PKG_INSTALL="echo"
            export DEPS=""
            ;;
    esac
    
    log "Detected: ${CYAN}${OS_ID}${RESET} ${DIM}${OS_VERSION}${RESET}"
}

install_packages() {
    info "Installing system packages..."
    echo -e "${GRAY}────────────────────────────────────────────────────────────────────────────${RESET}"
    
    $PKG_UPDATE || {
        error "Failed to update package lists"
        exit 1
    }
    
    if [ -n "$DEPS" ]; then
        $PKG_INSTALL $DEPS || {
            error "Failed to install dependencies"
            exit 1
        }
    fi
    
    log "System packages installed: ${DIM}git, curl, wget, ffmpeg${RESET}"
}

install_bun() {
    info "Checking Bun runtime..."
    echo -e "${GRAY}────────────────────────────────────────────────────────────────────────────${RESET}"
    
    if [ -d "$HOME/.bun" ]; then
        info "Bun already installed, upgrading to latest version..."
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
        "$BUN_PATH" upgrade 2>/dev/null || true
    else
        info "Installing Bun runtime..."
        curl -fsSL https://bun.sh/install | bash || {
            error "Failed to install Bun"
            exit 1
        }
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
    fi
    
    if [ ! -f "$BUN_PATH" ]; then
        error "Bun binary not found at ${YELLOW}${BUN_PATH}${RESET}"
        exit 1
    fi
    
    if ! "$BUN_PATH" --version &>/dev/null; then
        error "Bun installation verification failed"
        exit 1
    fi
    
    export BUN_VERSION=$("$BUN_PATH" --version)
    log "Bun runtime ready: ${CYAN}v${BUN_VERSION}${RESET}"
}

install_dependencies() {
    echo ""
    echo -e "${BOLD}${CYAN} ✦ System Dependencies ✦ ${RESET}"
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    echo -e "${DIM}Install required packages and runtime.${RESET}"
    echo ""

    detect_distro
    echo ""
    install_packages
    echo ""
    install_bun
    echo ""
}