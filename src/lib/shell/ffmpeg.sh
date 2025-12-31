#!/bin/bash

install_ffmpeg() {
    return 0
}

validate_ffmpeg() {
    print_info "Validating FFmpeg version..."
    
    if ! command -v ffmpeg &> /dev/null; then
        print_error "FFmpeg not found after installation"
        exit 1
    fi
    
    FFMPEG_VERSION=$(ffmpeg -version | head -n1 | awk '{print $3}' | cut -d. -f1)
    
    if [[ "$FFMPEG_VERSION" =~ ^[0-9]+$ ]] && [ "$FFMPEG_VERSION" -ge 4 ]; then
        print_success "FFmpeg version $FFMPEG_VERSION detected"
    else
        print_warning "FFmpeg version could not be determined or may be incompatible"
        print_info "Detected version: $FFMPEG_VERSION"
        print_info "Continuing anyway..."
    fi
}