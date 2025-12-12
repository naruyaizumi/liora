#!/bin/bash

interactive_configure() {
    local work_dir="$1"
    local env_file="$work_dir/.env"
    
    echo ""
    print_separator
    print_info "Interactive Configuration"
    print_separator
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

configure_pairing_number() {
    local env_file="$1"
    
    echo ""
    print_info "WhatsApp Pairing Number Configuration"
    echo "Enter your WhatsApp number for bot pairing (without + or spaces)"
    echo "Example: 6281234567890"
    echo ""
    
    while true; do
        read -p "Pairing Number: " pairing_number
        
        if [[ -z "$pairing_number" ]]; then
            print_error "Pairing number cannot be empty!"
            continue
        fi
        
        if [[ ! "$pairing_number" =~ ^[0-9]{10,15}$ ]]; then
            print_error "Invalid format! Use only numbers (10-15 digits)"
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
    echo "Enter owner numbers (WhatsApp JID format)"
    echo "Example: 6281234567890@s.whatsapp.net"
    echo "You can add multiple owners separated by comma"
    echo ""
    
    read -p "Owner Numbers (or press Enter for default): " owner_numbers
    
    if [[ -n "$owner_numbers" ]]; then
        IFS=',' read -ra OWNERS <<< "$owner_numbers"
        owner_json="["
        for i in "${!OWNERS[@]}"; do
            owner="${OWNERS[$i]}"
            owner=$(echo "$owner" | xargs)
            if [ $i -gt 0 ]; then
                owner_json+=","
            fi
            owner_json+="\"$owner\""
        done
        owner_json+="]"
        
        sed -i "s/^OWNERS=.*/OWNERS=$owner_json/" "$env_file"
        print_success "Owner numbers configured"
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

print_question() {
    echo -n "QUESTION: $1 "
}

print_separator() {
    echo "================================================================"
}