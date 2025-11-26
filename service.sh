#!/bin/bash

set -e

SERVICE_NAME="liora"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
HELPER_FILE="/usr/local/bin/bot"
WORK_DIR="/root/liora"
BUN_PATH="/root/.bun/bin/bun"
SUPERVISOR_PATH="${WORK_DIR}/rs/target/release/liora-rs"
TIME_ZONE="Asia/Jakarta"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERROR_ICON="☠️"
SUCCESS_ICON="🚀"
INFO_ICON="🥟"

print_error() {
    echo -e "${RED}${ERROR_ICON} $1${NC}"
}

print_success() {
    echo -e "${GREEN}${SUCCESS_ICON} $1${NC}"
}

print_info() {
    echo -e "${YELLOW}${INFO_ICON} $1${NC}"
}

cleanup_on_error() {
    print_error "Installation failed. Cleaning up..."
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    rm -f "$SERVICE_FILE"
    rm -f "$HELPER_FILE"
    exit 1
}

trap cleanup_on_error ERR

print_info "Validating OS compatibility..."

if [ ! -f /etc/os-release ]; then
    print_error "Cannot detect OS. /etc/os-release not found."
    exit 1
fi

OS_ID=$(grep '^ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
OS_VERSION_ID=$(grep '^VERSION_ID=' /etc/os-release | cut -d= -f2 | tr -d '"')

if [[ "$OS_ID" != "ubuntu" && "$OS_ID" != "debian" ]]; then
    print_error "Unsupported OS: $OS_ID. Only Ubuntu 24.04 or Debian 12 are supported."
    exit 1
fi

if [[ "$OS_ID" == "ubuntu" && "$OS_VERSION_ID" != "24.04" ]]; then
    print_error "Ubuntu version $OS_VERSION_ID is not supported. Use Ubuntu 24.04."
    exit 1
fi

if [[ "$OS_ID" == "debian" && "$OS_VERSION_ID" != "12" ]]; then
    print_error "Debian version $OS_VERSION_ID is not supported. Use Debian 12."
    exit 1
fi

print_success "OS validation passed: $OS_ID $OS_VERSION_ID"

print_info "Installing system dependencies..."

apt-get update -qq || {
    print_error "Failed to update package lists"
    exit 1
}

apt-get install -y \
    ffmpeg libwebp-dev libavformat-dev \
    libavcodec-dev libavutil-dev libswresample-dev \
    libswscale-dev libavfilter-dev build-essential \
    python3 g++ pkg-config \
    cmake git curl unzip || {
    print_error "Failed to install system dependencies"
    exit 1
}

print_success "System dependencies installed"

print_info "Validating FFmpeg version..."

if ! command -v ffmpeg &> /dev/null; then
    print_error "FFmpeg not found after installation"
    exit 1
fi

FFMPEG_VERSION=$(ffmpeg -version | head -n1 | awk '{print $3}' | cut -d. -f1)

if [[ "$FFMPEG_VERSION" != "5" && "$FFMPEG_VERSION" != "6" ]]; then
    print_error "FFmpeg version $FFMPEG_VERSION detected. Only version 5, or 6 are supported."
    exit 1
fi

print_success "FFmpeg version $FFMPEG_VERSION detected"

print_info "Installing Rust toolchain..."

if ! command -v rustc &> /dev/null; then
    print_info "Rust not found, installing..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y || {
        print_error "Failed to install Rust"
        exit 1
    }
    source "$HOME/.cargo/env"
else
    print_info "Rust already installed, ensuring latest stable..."
    rustup update stable
fi

if ! command -v cargo &> /dev/null; then
    print_error "Cargo not found after Rust installation"
    exit 1
fi

RUST_VERSION=$(rustc --version | awk '{print $2}')
print_success "Rust installed successfully (version: $RUST_VERSION)"

print_info "Installing Bun..."

if [ -d "$HOME/.bun" ]; then
    print_info "Bun already installed, upgrading..."
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
else
    curl -fsSL https://bun.sh/install | bash || {
        print_error "Failed to install Bun"
        exit 1
    }
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

if [ ! -f "$BUN_PATH" ]; then
    print_error "Bun installation failed - executable not found at $BUN_PATH"
    exit 1
fi

if ! "$BUN_PATH" --version &>/dev/null; then
    print_error "Bun installation failed - cannot execute bun"
    exit 1
fi

BUN_VERSION=$("$BUN_PATH" --version)
print_success "Bun installed successfully (version: $BUN_VERSION)"

print_info "Upgrading Bun to latest version..."
"$BUN_PATH" upgrade || print_info "Bun upgrade failed, continuing with current version..."

print_info "Setting up Liora..."

if [ -d "$WORK_DIR" ]; then
    print_info "Liora directory exists. Updating..."
    cd "$WORK_DIR" || {
        print_error "Failed to change to Liora directory"
        exit 1
    }
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    git stash push -m "Auto-stash before update $(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    git pull origin "$CURRENT_BRANCH" || {
        print_error "Failed to update Liora repository"
        exit 1
    }
else
    print_info "Cloning Liora repository..."
    git clone https://github.com/naruyaizumi/liora.git "$WORK_DIR" || {
        print_error "Failed to clone Liora repository"
        exit 1
    }
    cd "$WORK_DIR" || {
        print_error "Failed to change to Liora directory"
        exit 1
    }
fi

print_info "Installing Liora dependencies..."
"$BUN_PATH" install || {
    print_error "Failed to install Liora dependencies"
    exit 1
}

print_success "Liora dependencies installed"

print_info "Building Rust supervisor..."

cd "${WORK_DIR}/rs" || {
    print_error "Supervisor directory not found"
    exit 1
}

cargo build --release || {
    print_error "Failed to build Rust supervisor"
    exit 1
}

if [ ! -f "$SUPERVISOR_PATH" ]; then
    print_error "Supervisor binary not found after build"
    exit 1
fi

print_success "Rust supervisor built successfully"

cd "$WORK_DIR" || exit 1

print_success "Liora setup completed"

print_info "Creating systemd service..."

cat > "$SERVICE_FILE" <<EOL
[Unit]
Description=Liora WhatsApp Bot
After=network-online.target systemd-resolved.service
Wants=network-online.target systemd-resolved.service
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=root
WorkingDirectory=${WORK_DIR}
ExecStart=${SUPERVISOR_PATH}
KillMode=mixed
KillSignal=SIGTERM
FinalKillSignal=SIGKILL
SendSIGKILL=yes
TimeoutStopSec=30s
RestartSec=5s
Restart=always
Environment=NODE_ENV=production
Environment=TZ=${TIME_ZONE}
Environment=BUN_PATH=${BUN_PATH}
Environment=UV_THREADPOOL_SIZE=16
Environment=UNDICI_CONNECT_TIMEOUT=600000
Environment=UNDICI_REQUEST_TIMEOUT=600000
Environment=UNDICI_HEADERS_TIMEOUT=600000
Environment=PATH=${BUN_INSTALL}/bin:${HOME}/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
StandardOutput=journal
StandardError=journal
SyslogIdentifier=liora-bot
Nice=-10
IOSchedulingClass=2
IOSchedulingPriority=4
LimitNOFILE=1048576
LimitNPROC=1048576
LimitSTACK=infinity
OOMScoreAdjust=-900
PrivateTmp=true
ProtectSystem=off
ProtectHome=false
NoNewPrivileges=false
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
ReadWritePaths=/etc/resolv.conf /etc/hosts /etc/ssl/certs ${WORK_DIR}

[Install]
WantedBy=multi-user.target
EOL

print_success "Systemd service file created"

print_info "Enabling systemd service..."
systemctl daemon-reload || {
    print_error "Failed to reload systemd daemon"
    exit 1
}

systemctl enable "$SERVICE_NAME" || {
    print_error "Failed to enable service"
    exit 1
}

print_success "Systemd service created and enabled"

print_info "Creating helper CLI tool..."

cat > "$HELPER_FILE" <<'EOFHELPER'
#!/bin/bash

SERVICE="liora"
WORK_DIR="/root/liora"
BUN_PATH="/root/.bun/bin/bun"
SUPERVISOR_PATH="${WORK_DIR}/rs/target/release/liora-rs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

case "$1" in
    log)
        echo -e "${YELLOW}Showing logs (Ctrl+C to exit)...${NC}"
        journalctl -u $SERVICE -f -o cat
        ;;
    start)
        echo -e "${BLUE}Starting bot...${NC}"
        systemctl start $SERVICE && echo -e "${GREEN}Bot started!${NC}" || echo -e "${RED}Failed to start bot${NC}"
        ;;
    stop)
        echo -e "${BLUE}Stopping bot...${NC}"
        systemctl stop $SERVICE && echo -e "${GREEN}Bot stopped!${NC}" || echo -e "${RED}Failed to stop bot${NC}"
        ;;
    restart)
        echo -e "${BLUE}Restarting bot...${NC}"
        systemctl restart $SERVICE && echo -e "${GREEN}Bot restarted!${NC}" || echo -e "${RED}Failed to restart bot${NC}"
        ;;
    status)
        systemctl status $SERVICE --no-pager
        ;;
    update)
        echo -e "${YELLOW}Updating Liora...${NC}"
        cd "$WORK_DIR" || { echo -e "${RED}Failed to change directory${NC}"; exit 1; }
        CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
        git stash push -m "Auto-stash before update $(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
        git pull origin "$CURRENT_BRANCH" || { echo -e "${RED}Git pull failed${NC}"; exit 1; }
        "$BUN_PATH" install || { echo -e "${RED}Dependency installation failed${NC}"; exit 1; }
        echo -e "${BLUE}Rebuilding Rust supervisor...${NC}"
        cd "${WORK_DIR}/rs" || { echo -e "${RED}Supervisor directory not found${NC}"; exit 1; }
        cargo build --release || { echo -e "${RED}Supervisor build failed${NC}"; exit 1; }
        echo -e "${GREEN}Supervisor rebuilt successfully${NC}"
        systemctl restart $SERVICE && echo -e "${GREEN}Bot updated and restarted!${NC}" || echo -e "${RED}Failed to restart bot${NC}"
        ;;
    logs)
        echo -e "${YELLOW}Showing last 100 log lines...${NC}"
        journalctl -u $SERVICE -n 100 --no-pager
        ;;
    rebuild)
        echo -e "${BLUE}Rebuilding Rust supervisor...${NC}"
        cd "${WORK_DIR}/rs" || { echo -e "${RED}Supervisor directory not found${NC}"; exit 1; }
        cargo build --release || { echo -e "${RED}Build failed${NC}"; exit 1; }
        echo -e "${GREEN}Supervisor rebuilt successfully${NC}"
        echo -e "${YELLOW}Restart service to use new binary: bot restart${NC}"
        ;;
    *)
        echo -e "${BLUE}Liora Bot Management CLI${NC}"
        echo ""
        echo "Usage: bot {start|stop|restart|log|logs|status|update|rebuild}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the bot"
        echo "  stop    - Stop the bot"
        echo "  restart - Restart the bot"
        echo "  log     - Show real-time logs (live)"
        echo "  logs    - Show last 100 log entries"
        echo "  status  - Show service status"
        echo "  update  - Update bot from git, rebuild supervisor, and restart"
        echo "  rebuild - Rebuild Rust supervisor only (manual restart needed)"
        exit 1
        ;;
esac
EOFHELPER

chmod +x "$HELPER_FILE" || {
    print_error "Failed to make helper CLI executable"
    exit 1
}

print_success "Helper CLI created"

echo ""
echo -e "${GREEN}${SUCCESS_ICON}========================================${NC}"
echo -e "${GREEN}${SUCCESS_ICON} Liora bot installed successfully!${NC}"
echo -e "${GREEN}${SUCCESS_ICON}========================================${NC}"
echo ""
echo -e "${YELLOW}${INFO_ICON} Parent Process: Rust Supervisor${NC}"
echo -e "${YELLOW}${INFO_ICON} Child Process: Bun + JavaScript${NC}"
echo ""
echo -e "${BLUE}To start the bot, run:${NC}"
echo -e "  ${GREEN}bot restart${NC}"
echo ""
echo -e "${BLUE}Available commands:${NC}"
echo -e "  bot start   - Start the bot"
echo -e "  bot stop    - Stop the bot"
echo -e "  bot restart - Restart the bot"
echo -e "  bot log     - View live logs"
echo -e "  bot status  - Check service status"
echo -e "  bot update  - Update from git and restart"
echo ""