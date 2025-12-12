#!/bin/bash

get_latest_release_tag() {
    local repo_url="$1"
    local latest_tag
    latest_tag=$(git ls-remote --tags --refs "$repo_url" | 
                 grep -oP 'refs/tags/v\d+\.\d+\.\d+$' | 
                 sed 's|refs/tags/||' | 
                 sort -V | 
                 tail -1)
    
    if [ -z "$latest_tag" ]; then
        latest_tag=$(git ls-remote --tags --refs "$repo_url" | 
                     grep -oP 'refs/tags/\d+\.\d+\.\d+$' | 
                     sed 's|refs/tags/||' | 
                     sort -V | 
                     tail -1)
    fi
    
    echo "$latest_tag"
}

setup_liora() {
    local work_dir="$1"
    local repo_url="$2"
    local time_zone="$3"
    
    print_info "Setting up Liora..."
    
    if [ -d "$work_dir" ]; then
        print_info "Liora directory exists. Removing and reinstalling..."
        
        if systemctl is-active --quiet "liora" 2>/dev/null; then
            systemctl stop "liora" 2>/dev/null || true
        fi
        
        BACKUP_DIR="${work_dir}.backup.$(date +%Y%m%d_%H%M%S)"
        mv "$work_dir" "$BACKUP_DIR"
        print_info "Old installation backed up to $BACKUP_DIR"
    fi
    
    print_info "Fetching latest release tag..."
    LATEST_TAG=$(get_latest_release_tag "$repo_url")
    
    if [ -z "$LATEST_TAG" ]; then
        print_info "No release tag found, using main branch..."
        git clone "$repo_url" "$work_dir" || {
            print_error "Failed to clone Liora repository"
            exit 1
        }
    else
        print_success "Latest release tag: $LATEST_TAG"
        git clone --branch "$LATEST_TAG" --depth 1 "$repo_url" "$work_dir" || {
            print_error "Failed to clone Liora repository at tag $LATEST_TAG"
            exit 1
        }
    fi
    
    cd "$work_dir" || {
        print_error "Failed to change to Liora directory"
        exit 1
    }
    
    CURRENT_TAG=$(git describe --tags 2>/dev/null || echo "main")
    echo "$CURRENT_TAG" > "$work_dir/.current_version"
    
    print_success "Liora cloned successfully (version: $CURRENT_TAG)"
    
    print_info "Creating .env configuration file..."
    
    cat > "$work_dir/.env" <<EOF
PAIRING_NUMBER=

OWNERS=["113748182302861","227551947555018"]
GROUP_LINK=https://chat.whatsapp.com
WATERMARK=Liora
AUTHOR=Naruya Izumi
STICKPACK=Liora Stickers
STICKAUTH=Naruya Izumi

NODE_ENV=production
TZ=${time_zone}
EOF
    
    print_success ".env file created at $work_dir/.env"
    
    print_info "Installing Liora dependencies..."
    pnpm install || {
        print_error "Failed to install Liora dependencies"
        exit 1
    }
    
    print_success "Liora dependencies installed"
    print_success "Liora setup completed"
}