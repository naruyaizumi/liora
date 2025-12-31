#!/bin/bash

install_rust() {
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
}