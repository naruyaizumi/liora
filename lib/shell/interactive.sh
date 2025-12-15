#!/bin/bash

interactive_configure() {
    local work_dir="$1"
    local -n pkg_manager_ref="$2"
    local -n proc_manager_ref="$3"
    local env_file="$work_dir/.env"
    
    echo ""
    print_separator
    print_info "Interactive Configuration"
    print_separator
    echo ""
    
    select_package_manager pkg_manager_ref
    select_process_manager proc_manager_ref
    
    echo ""
    print_question "Do you want to configure the bot now? (Y/n)"
    read -r configure_now
    configure_now=${configure_now:-Y}
    
    if [[ ! "$configure_now" =~ ^[Yy]$ ]]; then
        print_info "Skipping configuration. You can configure later with: bot config"
        return 0
    fi
    
    configure_pairing_number "$env_file"
    configure_owner_numbers "$env_file"
    configure_additional_settings "$env_file"
    
    echo ""
    print_success "Configuration completed!"
    echo ""
}

select_package_manager() {
    local -n result="$1"
    
    echo ""
    print_info "Package Manager Selection"
    print_separator
    echo ""
    echo "Select your preferred package manager:"
    echo "  1) pnpm (recommended - fast and efficient)"
    echo "  2) npm (standard Node.js package manager)"
    echo "  3) yarn (modern package manager)"
    echo ""
    
    while true; do
        read -p "Choose package manager [1-3] (default: 1): " pm_choice
        pm_choice=${pm_choice:-1}
        
        case $pm_choice in
            1)
                result="pnpm"
                print_success "Selected: pnpm"
                break
                ;;
            2)
                result="npm"
                print_success "Selected: npm"
                break
                ;;
            3)
                result="yarn"
                print_success "Selected: yarn"
                break
                ;;
            *)
                print_error "Invalid choice. Please select 1-3."
                ;;
        esac
    done
}

select_process_manager() {
    local -n result="$1"
    
    echo ""
    print_info "Process Manager Selection"
    print_separator
    echo ""
    echo "Select your preferred process manager:"
    echo "  1) systemd (recommended - system-level service)"
    echo "  2) pm2 (process manager with monitoring)"
    echo ""
    echo "systemd pros: Native Linux service, automatic restart, journal logging"
    echo "pm2 pros: Easy monitoring, process clustering, built-in log rotation"
    echo ""
    
    while true; do
        read -p "Choose process manager [1-2] (default: 1): " proc_choice
        proc_choice=${proc_choice:-1}
        
        case $proc_choice in
            1)
                result="systemd"
                print_success "Selected: systemd"
                break
                ;;
            2)
                result="pm2"
                print_success "Selected: pm2"
                print_info "PM2 will be installed automatically"
                break
                ;;
            *)
                print_error "Invalid choice. Please select 1-2."
                ;;
        esac
    done
}

configure_pairing_number() {
    local env_file="$1"
    
    echo ""
    print_info "WhatsApp Pairing Number Configuration"
    print_separator
    echo ""
    echo "Enter your WhatsApp number for bot pairing"
    echo "Format: Country code + number (without + or spaces)"
    echo "Example: 6281234567890"
    echo ""
    
    while true; do
        read -p "Pairing Number: " pairing_number
        
        if [[ -z "$pairing_number" ]]; then
            print_error "Pairing number cannot be empty"
            continue
        fi
        
        if [[ ! "$pairing_number" =~ ^[0-9]{10,15}$ ]]; then
            print_error "Invalid format. Use only numbers (10-15 digits)"
            continue
        fi
        
        echo ""
        print_question "Confirm pairing number: $pairing_number (Y/n)"
        read -r confirm
        confirm=${confirm:-Y}
        
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            sed -i "s/^PAIRING_NUMBER=.*/PAIRING_NUMBER=$pairing_number/" "$env_file"
            print_success "Pairing number configured: $pairing_number"
            break
        fi
    done
}

configure_owner_numbers() {
    local env_file="$1"
    
    echo ""
    print_question "Do you want to configure owner numbers? (Y/n)"
    read -r configure_owners
    configure_owners=${configure_owners:-Y}
    
    if [[ ! "$configure_owners" =~ ^[Yy]$ ]]; then
        print_info "Keeping default owner configuration"
        return 0
    fi
    
    echo ""
    print_info "Owner Numbers Configuration"
    print_separator
    echo ""
    echo "Enter owner numbers in WhatsApp JID format"
    echo "Format: number@s.whatsapp.net"
    echo "Example: 6281234567890@s.whatsapp.net"
    echo "Multiple owners: separate with comma"
    echo ""
    
    read -p "Owner Numbers (or press Enter to skip): " owner_numbers
    
    if [[ -n "$owner_numbers" ]]; then
        IFS=',' read -ra OWNERS <<< "$owner_numbers"
        owner_json="["
        for i in "${!OWNERS[@]}"; do
            owner="${OWNERS[$i]}"
            owner=$(echo "$owner" | xargs)
            
            if [[ ! "$owner" =~ @s\.whatsapp\.net$ ]]; then
                print_warning "Invalid format for: $owner (skipping)"
                continue
            fi
            
            if [ ${#owner_json} -gt 1 ]; then
                owner_json+=","
            fi
            owner_json+="\"$owner\""
        done
        owner_json+="]"
        
        if [ "$owner_json" != "[]" ]; then
            sed -i "s/^OWNERS=.*/OWNERS=$owner_json/" "$env_file"
            print_success "Owner numbers configured"
        else
            print_warning "No valid owner numbers provided"
        fi
    else
        print_info "Using default owner configuration"
    fi
}

configure_additional_settings() {
    local env_file="$1"
    
    echo ""
    print_question "Do you want to configure additional settings? (y/N)"
    read -r configure_additional
    configure_additional=${configure_additional:-N}
    
    if [[ ! "$configure_additional" =~ ^[Yy]$ ]]; then
        return 0
    fi
    
    echo ""
    print_info "Additional Settings"
    print_separator
    echo ""
    
    read -p "Bot Watermark (default: Liora): " watermark
    if [[ -n "$watermark" ]]; then
        sed -i "s/^WATERMARK=.*/WATERMARK=$watermark/" "$env_file"
    fi
    
    read -p "Bot Author (default: Naruya Izumi): " author
    if [[ -n "$author" ]]; then
        sed -i "s/^AUTHOR=.*/AUTHOR=$author/" "$env_file"
    fi
    
    read -p "Group Link (default: https://chat.whatsapp.com): " group_link
    if [[ -n "$group_link" ]]; then
        sed -i "s|^GROUP_LINK=.*|GROUP_LINK=$group_link|" "$env_file"
    fi
    
    print_success "Additional settings configured"
}

save_installation_config() {
    local config_file="$1"
    local pkg_manager="$2"
    local proc_manager="$3"
    
    cat > "$config_file" <<EOF
PACKAGE_MANAGER=$pkg_manager
PROCESS_MANAGER=$proc_manager
INSTALL_DATE=$(date +%Y-%m-%d\ %H:%M:%S)
EOF
    
    print_success "Installation configuration saved"
}

print_question() {
    echo -n "QUESTION: $1 "
}

print_separator() {
    echo "================================================================"
}