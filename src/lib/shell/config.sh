#!/bin/bash

validate_phone() {
    local phone="$1"
    echo "$phone" | grep -qE '^[0-9]{10,15}$'
}

validate_time_format() {
    local format="$1"
    echo "$format" | grep -qE '^[HMSmsDdYy:/. -]+$'
}

prompt_pairing() {
    echo ""
    echo -e "${BOLD}${CYAN} ✦ WhatsApp Configuration ✦ ${RESET}"
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    echo -e "${DIM}Link the bot with your WhatsApp account.${RESET}"
    echo -e "${DIM}Enter your phone number and pairing code below.${RESET}"
    echo ""

    while true; do
        echo -ne "${WHITE}WhatsApp number${RESET} ${DIM}(without +)${RESET}: "
        read -r PAIRING_NUM < /dev/tty

        if validate_phone "$PAIRING_NUM"; then
            export PAIRING_NUM
            log "Phone number: ${GREEN}+${PAIRING_NUM}${RESET}"
            break
        else
            error "Invalid format. Enter 10–15 digits without + or spaces."
        fi
    done

    echo -ne "${WHITE}Pairing code${RESET} ${DIM}[default: CUMICUMI]${RESET}: "
    read -r code < /dev/tty
    export PAIRING_CODE="${code:-CUMICUMI}"
    log "Pairing code: ${GREEN}${PAIRING_CODE}${RESET}"
    echo ""
}

prompt_owners() {
    echo ""
    echo -e "${BOLD}${CYAN} ✦ Owner Configuration ✦ ${RESET}"
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    echo -e "${DIM}Owners have full administrative access to the bot.${RESET}"
    echo -e "${DIM}You may add multiple numbers or skip and configure later in .env.${RESET}"
    echo ""

    export OWNERS_ARRAY="[]"

    echo -ne "${WHITE}Add owner numbers?${RESET} ${DIM}[y/N]${RESET}: "
    read -r reply < /dev/tty

    if [[ "$reply" =~ ^[Yy]$ ]]; then
        local owner_list=()
        echo ""
        echo -e "${DIM}Enter numbers one by one. Leave empty to finish.${RESET}"
        echo ""

        while true; do
            echo -ne "${WHITE}Owner number${RESET} ${DIM}[empty = done]${RESET}: "
            read -r num < /dev/tty

            if [ -z "$num" ]; then
                break
            fi

            if validate_phone "$num"; then
                owner_list+=("\"$num\"")
                log "Owner added: ${GREEN}+${num}${RESET}"
            else
                error "Invalid format. Enter 10–15 digits without spaces."
            fi
        done

        if [ "${#owner_list[@]}" -gt 0 ]; then
            local IFS=,
            export OWNERS_ARRAY="[${owner_list[*]}]"
            log "Total owners configured: ${GREEN}${#owner_list[@]}${RESET}"
        else
            info "No owners added. Defaulting to empty list."
        fi
    else
        info "Skipped. You can configure owners later in .env."
    fi

    echo ""
}

prompt_metadata() {
    echo ""
    echo -e "${BOLD}${CYAN} ✦ Bot Metadata Setup ✦ ${RESET}"
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    echo -e "${DIM}Customize your bot branding and WhatsApp appearance.${RESET}"
    echo -e "${DIM}Press Enter to use the default values.${RESET}"
    echo ""

    echo -ne "${WHITE}Bot name${RESET} ${DIM}[default: 𝙇͢𝙞𝙤𝙧𝙖]${RESET}: "
    read -r input < /dev/tty
    export WATERMARK="${input:-𝙇͢𝙞𝙤𝙧𝙖}"

    echo -ne "${WHITE}Author name${RESET} ${DIM}[default: 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞]${RESET}: "
    read -r input < /dev/tty
    export AUTHOR="${input:-𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞}"

    echo -ne "${WHITE}Sticker pack name${RESET} ${DIM}[default: 𝙇͢𝙞𝙤𝙧𝙖]${RESET}: "
    read -r input < /dev/tty
    export STICKPACK="${input:-𝙇͢𝙞𝙤𝙧𝙖}"

    echo -ne "${WHITE}Sticker author${RESET} ${DIM}[default: © 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞]${RESET}: "
    read -r input < /dev/tty
    export STICKAUTH="${input:-© 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞}"

    echo -ne "${WHITE}Bot thumbnail URL${RESET} ${DIM}[default: https://files.catbox.moe/0zhmpq.jpg]${RESET}: "
    read -r input < /dev/tty
    export THUMBNAIL_URL="${input:-https://files.catbox.moe/0zhmpq.jpg}"

    log "Metadata configuration completed"
    echo ""
}

prompt_behavior() {
    echo ""
    echo -e "${BOLD}${CYAN} ✦ Bot Behavior Settings ✦ ${RESET}"
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    echo -e "${DIM}Configure how the bot responds to users.${RESET}"
    echo ""

    echo -e "${BOLD}${WHITE}Self Mode${RESET}"
    echo -e "  ${GREEN}Enabled${RESET}  → Only configured owners can use the bot"
    echo -e "  ${YELLOW}Disabled${RESET} → Anyone can use the bot"
    echo ""
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    echo ""

    while true; do
        echo -ne "${WHITE}Enable self mode (owner only)?${RESET} ${DIM}[default: N]${RESET}: "
        read -r reply < /dev/tty
        reply="${reply:-N}"

        case "$reply" in
            [Yy]*)
                export SELF_MODE="true"
                log "Self mode: ${GREEN}Enabled${RESET} ${DIM}(owner only)${RESET}"
                break
                ;;
            [Nn]*)
                export SELF_MODE="false"
                log "Self mode: ${YELLOW}Disabled${RESET} ${DIM}(public)${RESET}"
                break
                ;;
            *)
                error "Invalid input. Please enter Y or N."
                ;;
        esac
    done

    echo ""
}

prompt_logger() {
    echo ""
    echo -e "${BOLD}${CYAN} ✦ Logger Configuration ✦ ${RESET}"
    echo -e "${GRAY}────────────────────────────────────────────────────────────${RESET}"
    echo -e "${DIM}Control how much information the bot records.${RESET}"
    echo -e "${DIM}For production, 'silent' is recommended.${RESET}"
    echo ""

    echo -e "${BOLD}${WHITE}Bot Log Level${RESET}"
    echo -e "  ${DIM}1)${RESET} silent  ${GREEN}(recommended)${RESET}"
    echo -e "  ${DIM}2)${RESET} fatal"
    echo -e "  ${DIM}3)${RESET} error"
    echo -e "  ${DIM}4)${RESET} info"
    echo -e "  ${DIM}5)${RESET} debug"
    echo -e "  ${DIM}6)${RESET} trace"
    echo ""

    while true; do
        echo -ne "${WHITE}Select log level${RESET} ${DIM}[default: 4]${RESET}: "
        read -r choice < /dev/tty
        choice="${choice:-4}"

        case "$choice" in
            1) export LOG_LEVEL="silent"; break ;;
            2) export LOG_LEVEL="fatal"; break ;;
            3) export LOG_LEVEL="error"; break ;;
            4) export LOG_LEVEL="info"; break ;;
            5) export LOG_LEVEL="debug"; break ;;
            6) export LOG_LEVEL="trace"; break ;;
            *) error "Invalid choice. Enter 1–6." ;;
        esac
    done
    log "Bot log level: ${CYAN}${LOG_LEVEL}${RESET}"
    echo ""

    while true; do
        echo -ne "${WHITE}Baileys log level${RESET} ${DIM}[default: 1]${RESET}: "
        read -r choice < /dev/tty
        choice="${choice:-1}"

        case "$choice" in
            1) export BAILEYS_LOG="silent"; break ;;
            2) export BAILEYS_LOG="fatal"; break ;;
            3) export BAILEYS_LOG="error"; break ;;
            4) export BAILEYS_LOG="info"; break ;;
            5) export BAILEYS_LOG="debug"; break ;;
            6) export BAILEYS_LOG="trace"; break ;;
            *) error "Invalid choice. Enter 1–6." ;;
        esac
    done
    log "Baileys log level: ${CYAN}${BAILEYS_LOG}${RESET}"
    echo ""

    while true; do
        echo -ne "${WHITE}Pretty print logs?${RESET} ${DIM}[default: Y]${RESET}: "
        read -r reply < /dev/tty
        reply="${reply:-Y}"

        case "$reply" in
            [Yy]*) export LOG_PRETTY="true"; break ;;
            [Nn]*) export LOG_PRETTY="false"; break ;;
            *) error "Enter Y or N." ;;
        esac
    done

    while true; do
        echo -ne "${WHITE}Colorize logs?${RESET} ${DIM}[default: Y]${RESET}: "
        read -r reply < /dev/tty
        reply="${reply:-Y}"

        case "$reply" in
            [Yy]*) export LOG_COLORIZE="true"; break ;;
            [Nn]*) export LOG_COLORIZE="false"; break ;;
            *) error "Enter Y or N." ;;
        esac
    done

    echo -ne "${WHITE}Time format${RESET} ${DIM}[default: HH:MM]${RESET}: "
    read -r input < /dev/tty
    input="${input:-HH:MM}"

    if validate_time_format "$input"; then
        export LOG_TIME="$input"
    else
        warn "Invalid format. Using default: HH:MM"
        export LOG_TIME="HH:MM"
    fi

    echo -ne "${WHITE}Ignore fields${RESET} ${DIM}[default: pid,hostname]${RESET}: "
    read -r input < /dev/tty
    export LOG_IGNORE="${input:-pid,hostname}"

    log "Logger configuration completed"
    echo ""
}

create_env() {
    info "Creating environment configuration file..."
    
    [ ! -d "$WORK_DIR" ] && {
        error "Work directory not found: ${YELLOW}${WORK_DIR}${RESET}"
        exit 1
    }
    
    cat > "$WORK_DIR/.env" <<EOF
# ============================================================================
# Liora Bot Configuration
# ============================================================================

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

    log "Configuration file created: ${DIM}${WORK_DIR}/.env${RESET}"
}

configure_bot() {
    prompt_pairing
    prompt_owners
    prompt_metadata
    prompt_behavior
    prompt_logger
    create_env
}