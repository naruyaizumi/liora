#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[~]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }

if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root: sudo ./install.sh"
    exit 1
fi

CURRENT_DIR="$(pwd)"
INSTALL_DIR="/opt/liora-ai"
BIN_DIR="/usr/local/bin"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Liora AI Service Installer          ║${NC}"
echo -e "${BLUE}║   Claude Opus 4.5 - PostgreSQL 18     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

print_status "Checking Go installation..."
if ! command -v go &> /dev/null; then
    print_status "Installing Go 1.22..."
    wget -q https://go.dev/dl/go1.22.0.linux-amd64.tar.gz -O /tmp/go.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf /tmp/go.tar.gz
    export PATH=$PATH:/usr/local/go/bin
    echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
    rm /tmp/go.tar.gz
fi
print_success "Go $(go version | awk '{print $3}')"

print_status "Installing Protocol Buffers..."
apt-get update -qq
apt-get install -y -qq protobuf-compiler > /dev/null 2>&1
print_success "protoc $(protoc --version | awk '{print $2}')"

print_status "Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL not found. Install with: sudo apt install postgresql"
    exit 1
fi
print_success "PostgreSQL $(psql --version | awk '{print $3}')"

print_status "Checking Redis..."
if ! command -v redis-cli &> /dev/null; then
    print_warning "Redis not found (optional, installing...)"
    apt-get install -y -qq redis-server > /dev/null 2>&1
    systemctl enable redis-server --now
fi
print_success "Redis $(redis-cli --version | awk '{print $2}')"

print_status "Creating installation directory..."
mkdir -p "$INSTALL_DIR"
cp -r . "$INSTALL_DIR/"
cd "$INSTALL_DIR"

print_status "Setting up environment..."
if [ ! -f .env ]; then
    cat > .env <<EOF
# Claude API Configuration
ANTHROPIC_API_KEY=
ADMIN_KEY=$(openssl rand -hex 32)

# Server Configuration
GRPC_PORT=50051
GRPC_HOST=127.0.0.1

# PostgreSQL Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ai
POSTGRES_USER=liora
POSTGRES_PASSWORD=$(openssl rand -hex 16)

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# AI Settings
MAX_TOKENS=4096
TEMPERATURE=0.7
CACHE_TTL=300
RATE_LIMIT=20

# Logging
LOG_LEVEL=info
EOF
    print_success ".env created"
else
    print_success ".env exists"
fi

print_status "Setting up PostgreSQL..."
DB_USER=$(grep POSTGRES_USER .env | cut -d'=' -f2)
DB_PASS=$(grep POSTGRES_PASSWORD .env | cut -d'=' -f2)
DB_NAME=$(grep POSTGRES_DB .env | cut -d'=' -f2)

sudo -u postgres psql -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';" 2>/dev/null || print_warning "User $DB_USER already exists"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || print_warning "Database $DB_NAME already exists"
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || print_warning "pgvector not available"
print_success "Database configured"

print_status "Installing Go dependencies..."
export PATH=$PATH:/usr/local/go/bin
export GOPATH=/root/go
go mod download
go mod tidy
print_success "Dependencies installed"

print_status "Installing protoc Go plugins..."
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
export PATH=$PATH:$(go env GOPATH)/bin
print_success "Protoc plugins installed"

print_status "Generating gRPC code..."
mkdir -p pb
PROTO_PATH="../protos/ai.proto"
if [ ! -f "$PROTO_PATH" ]; then
    PROTO_PATH="protos/ai.proto"
fi

protoc \
  --proto_path="$(dirname $PROTO_PATH)" \
  --go_out=pb \
  --go_opt=paths=source_relative \
  --go-grpc_out=pb \
  --go-grpc_opt=paths=source_relative \
  "$(basename $PROTO_PATH)"

print_success "gRPC code generated"

print_status "Building AI service..."
go build -o bin/liora-ai cmd/main.go
print_success "Binary built: $INSTALL_DIR/bin/liora-ai"

print_status "Creating CLI tool..."
cat > "$BIN_DIR/ai" <<'EOFCLI'
#!/bin/bash

SERVICE_NAME="liora-ai"
INSTALL_DIR="/opt/liora-ai"

case "$1" in
    start)
        echo "Starting Liora AI Service..."
        systemctl start $SERVICE_NAME
        systemctl status $SERVICE_NAME --no-pager
        ;;
    stop)
        echo "Stopping Liora AI Service..."
        systemctl stop $SERVICE_NAME
        ;;
    restart)
        echo "Restarting Liora AI Service..."
        systemctl restart $SERVICE_NAME
        systemctl status $SERVICE_NAME --no-pager
        ;;
    status)
        systemctl status $SERVICE_NAME --no-pager
        ;;
    log)
        journalctl -u $SERVICE_NAME -f
        ;;
    logs)
        journalctl -u $SERVICE_NAME -n 100 --no-pager
        ;;
    edit)
        nano "$INSTALL_DIR/.env"
        echo "Configuration updated. Restart service with: ai restart"
        ;;
    config)
        cat "$INSTALL_DIR/.env"
        ;;
    info)
        echo "=== Liora AI Service Info ==="
        echo "Install Dir: $INSTALL_DIR"
        echo "Binary: $INSTALL_DIR/bin/liora-ai"
        echo "Config: $INSTALL_DIR/.env"
        echo ""
        systemctl status $SERVICE_NAME --no-pager | head -n 3
        ;;
    test)
        cd "$INSTALL_DIR"
        go run cmd/main.go
        ;;
    build)
        echo "Rebuilding service..."
        cd "$INSTALL_DIR"
        go build -o bin/liora-ai cmd/main.go
        echo "Build complete. Restart with: ai restart"
        ;;
    uninstall)
        echo "Uninstalling Liora AI Service..."
        systemctl stop $SERVICE_NAME
        systemctl disable $SERVICE_NAME
        rm -f /etc/systemd/system/$SERVICE_NAME.service
        rm -rf "$INSTALL_DIR"
        rm -f "$0"
        systemctl daemon-reload
        echo "Uninstalled successfully"
        ;;
    *)
        echo "Liora AI Service Manager"
        echo ""
        echo "Usage: ai <command>"
        echo ""
        echo "Commands:"
        echo "  start      Start the service"
        echo "  stop       Stop the service"
        echo "  restart    Restart the service"
        echo "  status     Show service status"
        echo "  log        Follow service logs (live)"
        echo "  logs       Show last 100 log lines"
        echo "  edit       Edit configuration (.env)"
        echo "  config     Show current configuration"
        echo "  info       Show service information"
        echo "  test       Run service in foreground (testing)"
        echo "  build      Rebuild the service binary"
        echo "  uninstall  Remove service completely"
        echo ""
        echo "Examples:"
        echo "  ai start"
        echo "  ai log"
        echo "  ai restart"
        ;;
esac
EOFCLI

chmod +x "$BIN_DIR/ai"
print_success "CLI tool installed: ai"

print_status "Creating systemd service..."
cat > /etc/systemd/system/liora-ai.service <<EOF
[Unit]
Description=Liora AI Service - Claude Opus 4.5
Documentation=https://github.com/your-repo
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
Environment="PATH=/usr/local/go/bin:/usr/bin:/bin"
ExecStart=$INSTALL_DIR/bin/liora-ai
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=liora-ai

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable liora-ai
print_success "Systemd service created"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Installation Complete! 🎉            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Add your Anthropic API key${NC}"
echo ""
echo "1. Get API key from: https://console.anthropic.com/settings/keys"
echo "2. Edit config:"
echo -e "   ${BLUE}ai edit${NC}"
echo "3. Add your API key to ANTHROPIC_API_KEY="
echo "4. Start service:"
echo -e "   ${BLUE}ai start${NC}"
echo ""
echo -e "${BLUE}Available commands:${NC}"
echo "  ai start      - Start service"
echo "  ai stop       - Stop service"
echo "  ai restart    - Restart service"
echo "  ai status     - Check status"
echo "  ai log        - Follow logs"
echo "  ai edit       - Edit config"
echo "  ai info       - Service info"
echo ""
echo -e "${GREEN}Installation directory: $INSTALL_DIR${NC}"
echo -e "${GREEN}CLI command: ai${NC}"
echo ""
print_success "Ready to use!"