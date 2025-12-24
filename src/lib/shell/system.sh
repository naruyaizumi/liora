#!/bin/bash

validate_os() {
    print_info "Validating OS compatibility..."
    
    if [ ! -f /etc/os-release ]; then
        print_error "Cannot detect OS. /etc/os-release not found."
        exit 1
    fi
    
    OS_ID=$(grep '^ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
    OS_VERSION_ID=$(grep '^VERSION_ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
    
    if [[ "$OS_ID" != "ubuntu" && "$OS_ID" != "debian" ]]; then
        print_error "Unsupported OS: $OS_ID. Only Ubuntu 24.04 or Debian 12 are supported."
        exit 1
    fi
    
    if [[ "$OS_ID" == "ubuntu" && "$OS_VERSION_ID" != "24.04" ]]; then
        print_error "Ubuntu version $OS_VERSION_ID is not supported. Use Ubuntu 24.04."
        exit 1
    fi
    
    if [[ "$OS_ID" == "debian" && "$OS_VERSION_ID" != "12" ]]; then
        print_error "Debian version $OS_VERSION_ID is not supported. Use Debian 12."
        exit 1
    fi
    
    print_success "OS validation passed: $OS_ID $OS_VERSION_ID"
}

install_system_dependencies() {
    print_info "Installing system dependencies..."
    
    apt-get update -qq || {
        print_error "Failed to update package lists"
        exit 1
    }
    
    apt-get install -y \
        ffmpeg libwebp-dev libavformat-dev \
        libavcodec-dev libavutil-dev libswresample-dev \
        libswscale-dev libavfilter-dev build-essential \
        python3 g++ pkg-config jq \
        cmake git curl unzip wget ca-certificates gnupg lsb-release || {
        print_error "Failed to install system dependencies"
        exit 1
    }
    
    print_success "System dependencies installed"
}

validate_ffmpeg() {
    print_info "Validating FFmpeg version..."
    
    if ! command -v ffmpeg &> /dev/null; then
        print_error "FFmpeg not found after installation"
        exit 1
    fi
    
    FFMPEG_VERSION=$(ffmpeg -version | head -n1 | awk '{print $3}' | cut -d. -f1)
    
    if [[ "$FFMPEG_VERSION" != "5" && "$FFMPEG_VERSION" != "6" ]]; then
        print_error "FFmpeg version $FFMPEG_VERSION detected. Only version 5 or 6 are supported."
        print_error "Please install FFmpeg 5 or 6 manually."
        exit 1
    fi
    
    print_success "FFmpeg version $FFMPEG_VERSION detected"
}