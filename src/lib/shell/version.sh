#!/bin/bash
# Version Management - FIXED VERSION

get_versions() {
    git ls-remote --tags --refs "$REPO_URL" 2>/dev/null | 
    grep -oP 'refs/tags/(v)?\d+\.\d+\.\d+$' | 
    sed 's|refs/tags/||' | 
    sort -Vr
}

get_latest() {
    get_versions | head -1
}

validate_sha() {
    local sha="$1"
    [[ "$sha" =~ ^[a-f0-9]{7,40}$ ]]
}

select_version() {
    cat << "EOF"

Version Selection
================================================================================
EOF
    
    local versions=($(get_versions))
    local latest=$(get_latest)
    
    if [ ${#versions[@]} -eq 0 ]; then
        warn "No release tags found"
        echo "  1) Development (main branch)"
        echo "  2) Specific commit SHA"
        echo ""
    else
        echo "  1) Latest stable ($latest)"
        echo "  2) Development (main branch)"
        echo "  3) Specific version"
        echo "  4) Specific commit SHA"
        echo ""
    fi
    
    while true; do
        # FIX: Proper terminal input
        echo -n "Select: "
        read -r choice < /dev/tty
        
        case "$choice" in
            1)
                if [ ${#versions[@]} -eq 0 ]; then
                    export SELECTED_VERSION="main"
                else
                    export SELECTED_VERSION="$latest"
                fi
                log "Selected: $SELECTED_VERSION"
                break
                ;;
            2)
                if [ ${#versions[@]} -eq 0 ]; then
                    prompt_commit_sha
                else
                    export SELECTED_VERSION="main"
                    log "Selected: main"
                fi
                break
                ;;
            3)
                if [ ${#versions[@]} -eq 0 ]; then
                    error "Invalid option"
                    continue
                fi
                
                echo ""
                echo "Available versions:"
                for i in "${!versions[@]}"; do
                    echo "  $((i+1))) ${versions[$i]}"
                done
                echo ""
                
                while true; do
                    echo -n "Select [1-${#versions[@]}]: "
                    read -r ver_choice < /dev/tty
                    
                    if [[ $ver_choice =~ ^[0-9]+$ ]] && \
                       [ "$ver_choice" -ge 1 ] && \
                       [ "$ver_choice" -le ${#versions[@]} ]; then
                        export SELECTED_VERSION="${versions[$((ver_choice-1))]}"
                        log "Selected: $SELECTED_VERSION"
                        break 2
                    else
                        error "Invalid selection"
                    fi
                done
                ;;
            4)
                if [ ${#versions[@]} -eq 0 ]; then
                    error "Invalid option"
                    continue
                fi
                prompt_commit_sha
                break
                ;;
            *)
                error "Invalid option"
                ;;
        esac
    done
    echo ""
}

prompt_commit_sha() {
    echo ""
    info "Enter commit SHA (7-40 hex characters)"
    
    while true; do
        echo -n "SHA: "
        read -r sha < /dev/tty
        
        if validate_sha "$sha"; then
            export SELECTED_VERSION="$sha"
            log "Selected: $sha"
            break
        else
            error "Invalid SHA format (use 7-40 hex characters)"
        fi
    done
}

clone_and_install() {
    info "Cloning repository..."
    
    # FIX: Backup existing directory properly
    if [ -d "$WORK_DIR" ]; then
        warn "Directory exists, creating backup..."
        
        # Stop service first
        if [ "$PROCESS_MANAGER" = "systemd" ]; then
            systemctl stop "$SERVICE_NAME" 2>/dev/null || true
        elif [ "$PROCESS_MANAGER" = "pm2" ]; then
            command -v pm2 &>/dev/null && pm2 delete liora 2>/dev/null || true
        fi
        
        local backup_path="${WORK_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
        mv "$WORK_DIR" "$backup_path"
        log "Backup created: $backup_path"
    fi
    
    # Clone repository
    git clone "$REPO_URL" "$WORK_DIR" || {
        error "Failed to clone repository"
        exit 1
    }
    
    # FIX: Always cd and verify
    cd "$WORK_DIR" || {
        error "Failed to enter work directory"
        exit 1
    }
    
    # Checkout version
    if [ "$SELECTED_VERSION" = "main" ]; then
        info "Using main branch"
        git checkout main || {
            error "Failed to checkout main"
            exit 1
        }
    elif validate_sha "$SELECTED_VERSION"; then
        info "Checking out commit: $SELECTED_VERSION"
        git checkout "$SELECTED_VERSION" || {
            error "Failed to checkout commit"
            exit 1
        }
    else
        info "Checking out version: $SELECTED_VERSION"
        git checkout "$SELECTED_VERSION" || {
            error "Failed to checkout version"
            exit 1
        }
    fi
    
    # Save version
    echo "$SELECTED_VERSION" > "$WORK_DIR/.current_version"
    log "Repository cloned successfully"
    
    # Install packages
    info "Installing packages..."
    
    # FIX: Verify bun exists
    if [ ! -f "$BUN_PATH" ]; then
        error "Bun not found at $BUN_PATH"
        exit 1
    fi
    
    "$BUN_PATH" install || {
        error "Failed to install packages"
        exit 1
    }
    
    log "Packages installed successfully"
}