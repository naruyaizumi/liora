#!/bin/bash

install_bun() {
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
}