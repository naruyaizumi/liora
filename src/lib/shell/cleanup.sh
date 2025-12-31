#!/bin/bash

cleanup_on_error() {
    print_error "Installation failed. Cleaning up..."
    
    if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    fi
    if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    fi
    
    rm -f "$SERVICE_FILE"
    rm -f "$HELPER_FILE"
    
    systemctl daemon-reload 2>/dev/null || true
    
    print_info "Cleanup completed. You can run the script again."
    exit 1
}