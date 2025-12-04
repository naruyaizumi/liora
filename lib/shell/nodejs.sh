#!/bin/bash

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