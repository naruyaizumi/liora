#!/bin/bash

get_available_versions() {
    git ls-remote --tags --refs "$REPO_URL" 2>/dev/null | 
    grep -oP 'refs/tags/(v)?\d+\.\d+\.\d+$' | 
    sed 's|refs/tags/||' | 
    sort -Vr
}

prompt_version() {
    VERSIONS=($(get_available_versions))
    
    if [ ${#VERSIONS[@]} -eq 0 ]; then
        print_warning "No tags found, using main branch"
        SELECTED_VERSION="main"
        return
    fi
    
    cat << "EOF"

+---------------------------------------+
| Select Installation Version           |
+---------------------------------------+

EOF
    
    echo "  [1] Latest Stable (${VERSIONS[0]})"
    echo "  [2] Development (main branch)"
    echo "  [3] Specific Version"
    echo ""
    
    while true; do
        printf "liora> "
        read -r choice < /dev/tty
        
        case "$choice" in
            1)
                SELECTED_VERSION="${VERSIONS[0]}"
                print_success "Selected: $SELECTED_VERSION"
                break
                ;;
            2)
                SELECTED_VERSION="main"
                print_success "Selected: main (development)"
                break
                ;;
            3)
                echo ""
                echo "Available versions:"
                for i in "${!VERSIONS[@]}"; do
                    echo "  $((i+1)). ${VERSIONS[$i]}"
                done
                echo ""
                
                while true; do
                    printf "liora> "
                    read -r ver_choice < /dev/tty
                    
                    if [[ "$ver_choice" =~ ^[0-9]+$ ]] && [ "$ver_choice" -ge 1 ] && [ "$ver_choice" -le ${#VERSIONS[@]} ]; then
                        SELECTED_VERSION="${VERSIONS[$((ver_choice-1))]}"
                        print_success "Selected: $SELECTED_VERSION"
                        break 2
                    else
                        print_error "Invalid selection. Enter 1-${#VERSIONS[@]}"
                    fi
                done
                ;;
            *)
                print_error "Invalid option. Choose 1-3"
                ;;
        esac
    done
    echo ""
}

prompt_pairing() {
    cat << "EOF"
+---------------------------------------+
| WhatsApp Configuration                |
+---------------------------------------+

EOF
    
    while true; do
        printf "liora> Enter WhatsApp number (without +): "
        read -r PAIRING_NUM < /dev/tty
        
        if [[ "$PAIRING_NUM" =~ ^[0-9]{10,15}$ ]]; then
            print_success "Number: +$PAIRING_NUM"
            break
        else
            print_error "Invalid format. Enter 10-15 digits without +"
        fi
    done
    
    printf "liora> Enter pairing code [default: CUMICUMI]: "
    read -r PAIRING_CODE < /dev/tty
    PAIRING_CODE=${PAIRING_CODE:-CUMICUMI}
    print_success "Code: $PAIRING_CODE"
    echo ""
}

prompt_owner() {
    cat << "EOF"
+---------------------------------------+
| Bot Owner Configuration               |
+---------------------------------------+

EOF
    
    OWNERS_ARRAY="[]"
    
    printf "liora> Add owner numbers? [y/N]: "
    read -r add_owners < /dev/tty
    
    if [[ "$add_owners" =~ ^[Yy]$ ]]; then
        OWNER_LIST=()
        while true; do
            printf "liora> Owner number (without + or blank to finish): "
            read -r owner_num < /dev/tty
            
            if [ -z "$owner_num" ]; then
                break
            fi
            
            if [[ "$owner_num" =~ ^[0-9]{10,15}$ ]]; then
                OWNER_LIST+=("\"$owner_num\"")
                print_success "Added: +$owner_num"
            else
                print_error "Invalid format"
            fi
        done
        
        if [ ${#OWNER_LIST[@]} -gt 0 ]; then
            OWNERS_ARRAY="[$(IFS=,; echo "${OWNER_LIST[*]}")]"
            print_success "Total owners: ${#OWNER_LIST[@]}"
        fi
    fi
    echo ""
}

clone_repository() {
    print_info "Cloning repository..."
    
    if [ -d "$WORK_DIR" ]; then
        print_warning "Directory exists, backing up..."
        systemctl stop "$SERVICE_NAME" 2>/dev/null || true
        mv "$WORK_DIR" "${WORK_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    if [ "$SELECTED_VERSION" = "main" ]; then
        print_info "Installing from main branch"
        git clone --branch main --depth 1 "$REPO_URL" "$WORK_DIR" || {
            print_error "Failed to clone repository"
            exit 1
        }
    else
        print_info "Installing version: $SELECTED_VERSION"
        git clone --branch "$SELECTED_VERSION" --depth 1 "$REPO_URL" "$WORK_DIR" || {
            print_error "Failed to clone repository"
            exit 1
        }
    fi
    
    echo "$SELECTED_VERSION" > "$WORK_DIR/.current_version"
    print_success "Repository cloned"
}

create_env_file() {
    print_info "Creating configuration..."
    
    cat > "$WORK_DIR/.env" <<EOF
# ============================================
# STAFF CONFIGURATION
# ============================================
OWNERS=$OWNERS_ARRAY

# ============================================
# PAIRING CONFIGURATION
# ============================================
PAIRING_NUMBER=$PAIRING_NUM
PAIRING_CODE=$PAIRING_CODE

# ============================================
# BOT METADATA
# ============================================
WATERMARK=Liora
AUTHOR=Naruya Izumi
THUMBNAIL_URL=https://qu.ax/DdwBH.jpg

# ============================================
# LOGGER CONFIGURATION
# ============================================
LOG_LEVEL=info
LOG_PRETTY=true
LOG_COLORIZE=true
LOG_TIME_FORMAT=HH:MM
LOG_IGNORE=pid,hostname
EOF

    print_success "Configuration created"
}

install_bun_packages() {
    print_info "Installing packages with Bun..."
    
    cd "$WORK_DIR" || exit 1
    "$BUN_PATH" install || {
        print_error "Failed to install packages"
        exit 1
    }
    
    print_success "Packages installed"
}

setup_environment() {
    prompt_version
    prompt_pairing
    prompt_owner
    clone_repository
    create_env_file
    install_bun_packages
}