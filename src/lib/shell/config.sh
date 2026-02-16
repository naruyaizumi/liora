#!/bin/bash
# Bot Configuration - FIXED VERSION

validate_phone() {
    [[ "$1" =~ ^[0-9]{10,15}$ ]]
}

validate_time_format() {
    [[ "$1" =~ ^[HMSmsDdYy:/ -]+$ ]]
}

prompt_pairing() {
    cat << "EOF"

WhatsApp Configuration
================================================================================
EOF
    
    while true; do
        # FIX: Proper terminal input
        echo -n "WhatsApp number (without +): "
        read -r PAIRING_NUM < /dev/tty
        
        if validate_phone "$PAIRING_NUM"; then
            export PAIRING_NUM
            log "Number: +$PAIRING_NUM"
            break
        else
            error "Invalid format (10-15 digits required)"
        fi
    done
    
    echo -n "Pairing code [CUMICUMI]: "
    read -r code < /dev/tty
    export PAIRING_CODE="${code:-CUMICUMI}"
    log "Code: $PAIRING_CODE"
    echo ""
}

prompt_owners() {
    cat << "EOF"

Owner Configuration
================================================================================
EOF
    
    export OWNERS_ARRAY="[]"
    
    echo -n "Add owner numbers? [y/N]: "
    read -r reply < /dev/tty
    
    if [[ "$reply" =~ ^[Yy]$ ]]; then
        local owner_list=()
        
        while true; do
            echo -n "Owner number (empty to finish): "
            read -r num < /dev/tty
            
            [ -z "$num" ] && break
            
            if validate_phone "$num"; then
                owner_list+=("\"$num\"")
                log "Added: +$num"
            else
                error "Invalid format (10-15 digits)"
            fi
        done
        
        if [ ${#owner_list[@]} -gt 0 ]; then
            # FIX: Proper array joining
            local IFS=,
            export OWNERS_ARRAY="[${owner_list[*]}]"
            log "Total owners: ${#owner_list[@]}"
        fi
    fi
    echo ""
}

prompt_metadata() {
    cat << "EOF"

Bot Metadata
================================================================================
EOF
    
    echo -n "Watermark [𝙇͢𝙞𝙤𝙧𝙖]: "
    read -r input < /dev/tty
    export WATERMARK="${input:-𝙇͢𝙞𝙤𝙧𝙖}"
    
    echo -n "Author [𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞]: "
    read -r input < /dev/tty
    export AUTHOR="${input:-𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞}"
    
    echo -n "Sticker pack [𝙇͢𝙞𝙤𝙧𝙖]: "
    read -r input < /dev/tty
    export STICKPACK="${input:-𝙇͢𝙞𝙤𝙧𝙖}"
    
    echo -n "Sticker author [© 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞]: "
    read -r input < /dev/tty
    export STICKAUTH="${input:-© 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞}"
    
    echo -n "Thumbnail URL [https://files.catbox.moe/0zhmpq.jpg]: "
    read -r input < /dev/tty
    export THUMBNAIL_URL="${input:-https://files.catbox.moe/0zhmpq.jpg}"
    
    log "Metadata configured"
    echo ""
}

prompt_behavior() {
    cat << "EOF"

Bot Behavior
================================================================================
EOF
    
    while true; do
        echo -n "Self mode (owner only)? [Y/n]: "
        read -r reply < /dev/tty
        reply="${reply:-Y}"
        
        case "$reply" in
            [Yy]*)
                export SELF_MODE="true"
                log "Self mode: enabled"
                break
                ;;
            [Nn]*)
                export SELF_MODE="false"
                log "Self mode: disabled"
                break
                ;;
            *)
                error "Invalid input (Y or n)"
                ;;
        esac
    done
    echo ""
}

prompt_logger() {
    cat << "EOF"

Logger Configuration
================================================================================
EOF
    
    echo "Log levels: 1)silent 2)fatal 3)error 4)info 5)debug 6)trace"
    
    # Bot log level
    while true; do
        echo -n "Bot log level [1]: "
        read -r choice < /dev/tty
        choice="${choice:-1}"
        
        case "$choice" in
            1) export LOG_LEVEL="silent"; break ;;
            2) export LOG_LEVEL="fatal"; break ;;
            3) export LOG_LEVEL="error"; break ;;
            4) export LOG_LEVEL="info"; break ;;
            5) export LOG_LEVEL="debug"; break ;;
            6) export LOG_LEVEL="trace"; break ;;
            *) error "Invalid choice (1-6)" ;;
        esac
    done
    log "Log level: $LOG_LEVEL"
    
    # Baileys log level
    while true; do
        echo -n "Baileys log level [3]: "
        read -r choice < /dev/tty
        choice="${choice:-3}"
        
        case "$choice" in
            1) export BAILEYS_LOG="silent"; break ;;
            2) export BAILEYS_LOG="fatal"; break ;;
            3) export BAILEYS_LOG="error"; break ;;
            4) export BAILEYS_LOG="info"; break ;;
            5) export BAILEYS_LOG="debug"; break ;;
            6) export BAILEYS_LOG="trace"; break ;;
            *) error "Invalid choice (1-6)" ;;
        esac
    done
    log "Baileys log: $BAILEYS_LOG"
    
    # Pretty print
    while true; do
        echo -n "Pretty print? [Y/n]: "
        read -r reply < /dev/tty
        reply="${reply:-Y}"
        
        case "$reply" in
            [Yy]*) export LOG_PRETTY="true"; break ;;
            [Nn]*) export LOG_PRETTY="false"; break ;;
            *) error "Invalid input (Y or n)" ;;
        esac
    done
    
    # Colorize
    while true; do
        echo -n "Colorize? [Y/n]: "
        read -r reply < /dev/tty
        reply="${reply:-Y}"
        
        case "$reply" in
            [Yy]*) export LOG_COLORIZE="true"; break ;;
            [Nn]*) export LOG_COLORIZE="false"; break ;;
            *) error "Invalid input (Y or n)" ;;
        esac
    done
    
    # Time format
    echo -n "Time format [HH:MM]: "
    read -r input < /dev/tty
    input="${input:-HH:MM}"
    
    if validate_time_format "$input"; then
        export LOG_TIME="$input"
    else
        warn "Invalid format, using default: HH:MM"
        export LOG_TIME="HH:MM"
    fi
    
    # Ignore fields
    echo -n "Ignore fields [pid,hostname]: "
    read -r input < /dev/tty
    export LOG_IGNORE="${input:-pid,hostname}"
    
    log "Logger configured"
    echo ""
}

create_env() {
    info "Creating .env file..."
    
    # FIX: Ensure WORK_DIR exists
    [ ! -d "$WORK_DIR" ] && {
        error "Work directory not found: $WORK_DIR"
        exit 1
    }
    
    cat > "$WORK_DIR/.env" <<EOF
# Staff Configuration
OWNERS=$OWNERS_ARRAY

# Pairing Configuration
PAIRING_NUMBER=$PAIRING_NUM
PAIRING_CODE=$PAIRING_CODE

# Bot Metadata
WATERMARK=$WATERMARK
AUTHOR=$AUTHOR
STICKPACK=$STICKPACK
STICKAUTH=$STICKAUTH
THUMBNAIL_URL=$THUMBNAIL_URL

# Bot Behavior
SELF=$SELF_MODE

# Logger Configuration
LOG_LEVEL=$LOG_LEVEL
LOG_PRETTY=$LOG_PRETTY
LOG_COLORIZE=$LOG_COLORIZE
LOG_TIME_FORMAT=$LOG_TIME
LOG_IGNORE=$LOG_IGNORE
BAILEYS_LOG_LEVEL=$BAILEYS_LOG
EOF

    log "Configuration file created"
}

configure_bot() {
    prompt_pairing
    prompt_owners
    prompt_metadata
    prompt_behavior
    prompt_logger
    create_env
}