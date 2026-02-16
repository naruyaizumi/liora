#!/bin/bash
# Version Management

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
    echo "$sha" | grep -qE '^[a-f0-9]{7,40}$'
}

select_version() {
    echo ""
    echo -e "${BOLD}${CYAN} ✦ Version Selection ✦ ${RESET}"
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    echo -e "${DIM}Choose which version of Liora Bot you want to install.${RESET}"
    echo -e "${DIM}Stable versions are recommended for production use.${RESET}"
    echo ""

    local versions=($(get_versions))
    local latest=$(get_latest)
    
    if [ ${#versions[@]} -eq 0 ]; then
        warn "No stable releases found"
        echo ""
        echo -e "  ${GREEN}1${RESET}) ${WHITE}Development Branch${RESET} ${GRAY}(main)${RESET}"
        echo -e "     ${DIM}Latest features, may be unstable${RESET}"
        echo ""
        echo -e "  ${GREEN}2${RESET}) ${WHITE}Specific Commit${RESET}"
        echo -e "     ${DIM}Enter a specific commit SHA${RESET}"
        echo ""
    else
        echo -e "  ${GREEN}1${RESET}) ${WHITE}Latest Stable${RESET} ${YELLOW}(${latest})${RESET} ${MAGENTA}★ Recommended${RESET}"
        echo -e "     ${DIM}Production-ready, tested and stable${RESET}"
        echo ""
        echo -e "  ${GREEN}2${RESET}) ${WHITE}Development Branch${RESET} ${GRAY}(main)${RESET}"
        echo -e "     ${DIM}Latest features, may contain bugs${RESET}"
        echo ""
        echo -e "  ${GREEN}3${RESET}) ${WHITE}Specific Version${RESET}"
        echo -e "     ${DIM}Choose from available release versions${RESET}"
        echo ""
        echo -e "  ${GREEN}4${RESET}) ${WHITE}Specific Commit${RESET}"
        echo -e "     ${DIM}Advanced: Use a specific commit SHA${RESET}"
        echo ""
    fi
    
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    
    while true; do
        echo -n "Select option: "
        read -r choice < /dev/tty
        
        case "$choice" in
            1)
                if [ ${#versions[@]} -eq 0 ]; then
                    export SELECTED_VERSION="main"
                else
                    export SELECTED_VERSION="$latest"
                fi
                log "Selected: ${MAGENTA}${SELECTED_VERSION}${RESET}"
                break
                ;;
            2)
                if [ ${#versions[@]} -eq 0 ]; then
                    prompt_commit_sha
                else
                    export SELECTED_VERSION="main"
                    log "Selected: ${MAGENTA}main${RESET} ${DIM}(development)${RESET}"
                fi
                break
                ;;
            3)
                if [ ${#versions[@]} -eq 0 ]; then
                    error "Invalid option"
                    continue
                fi
                
                echo ""
                echo -e "${BOLD}${WHITE}Available Versions${RESET}"
                echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
                for i in "${!versions[@]}"; do
                    echo -e "  ${GREEN}$((i+1))${RESET}) ${CYAN}${versions[$i]}${RESET}"
                done
                echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
                echo ""
                
                while true; do
                    echo -n "Select version [1-${#versions[@]}]: "
                    read -r ver_choice < /dev/tty
                    
                    if [[ $ver_choice =~ ^[0-9]+$ ]] && \
                       [ "$ver_choice" -ge 1 ] && \
                       [ "$ver_choice" -le ${#versions[@]} ]; then
                        export SELECTED_VERSION="${versions[$((ver_choice-1))]}"
                        log "Selected: ${MAGENTA}${SELECTED_VERSION}${RESET}"
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
                error "Invalid option. Please choose 1-4"
                ;;
        esac
    done
    echo ""
}

prompt_commit_sha() {
    echo ""
    echo -e "${BOLD}${WHITE}Commit SHA Input${RESET}"
    echo -e "${GRAY}────────────────────────────────────────────────────────────────────────────${RESET}"
    echo -e "${DIM}Enter a commit SHA (7-40 hexadecimal characters)${RESET}"
    echo -e "${DIM}Example: 3ccfb25 or 3ccfb2516895da454790fa6384bfa7d1989d04f3${RESET}"
    echo -e "${GRAY}────────────────────────────────────────────────────────────────────────────${RESET}"
    echo ""
    
    while true; do
        echo -n "Commit SHA: "
        read -r sha < /dev/tty
        
        if validate_sha "$sha"; then
            export SELECTED_VERSION="$sha"
            log "Selected: ${MAGENTA}${sha}${RESET}"
            break
        else
            error "Invalid SHA format (must be 7-40 hexadecimal characters)"
        fi
    done
}

clone_and_install() {
    echo ""
    echo -e "${BOLD}${CYAN} ✦ Repository Installation ✦ ${RESET}"
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    echo -e "${DIM}Clone repository and install required packages.${RESET}"
    echo ""

    info "Cloning Liora Bot repository..."
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    
    if [ -d "$WORK_DIR" ]; then
        warn "Installation directory already exists"
        
        systemctl stop "$SERVICE_NAME" 2>/dev/null || true
        
        local backup_path="${WORK_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
        mv "$WORK_DIR" "$backup_path"
        log "Previous installation backed up to: ${DIM}${backup_path}${RESET}"
    fi
    
    git clone "$REPO_URL" "$WORK_DIR" || {
        error "Failed to clone repository"
        exit 1
    }
    
    cd "$WORK_DIR" || {
        error "Failed to enter work directory"
        exit 1
    }
    
    if [ "$SELECTED_VERSION" = "main" ]; then
        info "Checking out main branch..."
        git checkout main || {
            error "Failed to checkout main"
            exit 1
        }
    elif validate_sha "$SELECTED_VERSION"; then
        info "Checking out commit: ${YELLOW}${SELECTED_VERSION}${RESET}"
        git checkout "$SELECTED_VERSION" || {
            error "Failed to checkout commit"
            exit 1
        }
    else
        info "Checking out version: ${YELLOW}${SELECTED_VERSION}${RESET}"
        git checkout "$SELECTED_VERSION" || {
            error "Failed to checkout version"
            exit 1
        }
    fi
    
    echo "$SELECTED_VERSION" > "$WORK_DIR/.current_version"
    log "Repository cloned successfully"
    echo ""
    
    info "Installing Node.js packages..."
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    
    if [ ! -f "$BUN_PATH" ]; then
        error "Bun not found at ${YELLOW}${BUN_PATH}${RESET}"
        exit 1
    fi
    
    "$BUN_PATH" install || {
        error "Failed to install packages"
        exit 1
    }
    
    log "Packages installed successfully"
    echo ""
}