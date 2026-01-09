#!/bin/bash

detect_distro() {
    if [ ! -f /etc/os-release ]; then
        print_error "Cannot detect OS"
        exit 1
    fi
    
    . /etc/os-release
    OS_ID="$ID"
    
    case "$OS_ID" in
        ubuntu|debian)
            PKG_UPDATE="apt-get update -qq"
            PKG_INSTALL="apt-get install -y"
            DEPS="git curl wget ca-certificates"
            ;;
        *)
            print_error "Unsupported distribution: $OS_ID"
            print_info "Only Ubuntu and Debian are supported"
            exit 1
            ;;
    esac
    
    print_success "Detected: $OS_ID $VERSION_ID"
}

install_system_packages() {
    print_info "Installing essential packages..."
    
    $PKG_UPDATE || {
        print_error "Failed to update package lists"
        exit 1
    }
    
    $PKG_INSTALL $DEPS || {
        print_error "Failed to install dependencies"
        exit 1
    }
    
    print_success "Essential packages installed"
}

install_bun() {
    print_info "Installing Bun runtime..."
    
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
    print_success "Bun runtime installed: v$BUN_VERSION"
}

install_dependencies() {
    detect_distro
    install_system_packages
    install_bun
}