#!/bin/bash

detect_distro() {
    if [ ! -f /etc/os-release ]; then
        echo "Cannot detect OS"
        exit 1
    fi
    
    . /etc/os-release
    OS_ID="$ID"
    
    case "$OS_ID" in
        ubuntu|debian)
            PKG_UPDATE="apt-get update -qq"
            PKG_INSTALL="apt-get install -y"
            DEPS="git curl wget ca-certificates unzip ffmpeg"  # unzip dan ffmpeg ditambahkan di sini
            ;;
        *)
            echo "Unsupported distribution: $OS_ID"
            echo "Only Ubuntu and Debian are supported"
            exit 1
            ;;
    esac
    
    echo "Detected: $OS_ID $VERSION_ID"
}

install_system_packages() {
    echo "Installing essential packages..."
    
    $PKG_UPDATE || {
        echo "Failed to update package lists"
        exit 1
    }
    
    $PKG_INSTALL $DEPS || {
        echo "Failed to install dependencies"
        exit 1
    }
    
    echo "Essential packages installed"
}

install_bun() {
    echo "Installing Bun runtime..."
    
    if [ -d "$HOME/.bun" ]; then
        echo "Bun already installed, upgrading..."
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
        "$BUN_PATH" upgrade 2>/dev/null || true
    else
        curl -fsSL https://bun.sh/install | bash || {
            echo "Failed to install Bun"
            exit 1
        }
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
    fi
    
    if [ ! -f "$BUN_PATH" ] || ! "$BUN_PATH" --version &>/dev/null; then
        echo "Bun installation failed"
        exit 1
    fi
    
    BUN_VERSION=$("$BUN_PATH" --version)
    echo "Bun runtime installed: v$BUN_VERSION"
}

install_dependencies() {
    detect_distro
    install_system_packages
    install_bun
}