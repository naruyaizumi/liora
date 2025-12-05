#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Liora AI Service Installer          ║${NC}"
echo -e "${BLUE}║   Claude Opus 4.5                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run as root"
fi

print_status "Detecting operating system..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
else
    print_error "Cannot detect OS"
    exit 1
fi
print_success "Detected: $OS $VER"

print_status "Checking Go installation..."
if ! command -v go &> /dev/null; then
    print_error "Go is not installed"
    echo "Please install Go 1.22 or later from https://go.dev/dl/"
    exit 1
fi

GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
print_success "Go $GO_VERSION installed"

print_status "Checking Protocol Buffers compiler..."
if ! command -v protoc &> /dev/null; then
    print_warning "protoc not found, installing..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt-get update
        sudo apt-get install -y protobuf-compiler
    elif [ "$OS" = "arch" ] || [ "$OS" = "manjaro" ]; then
        sudo pacman -S --noconfirm protobuf
    else
        print_error "Please install protoc manually"
        exit 1
    fi
fi
print_success "protoc installed"

print_status "Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL client not found"
    read -p "Install PostgreSQL? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
            sudo apt-get install -y postgresql postgresql-contrib
        elif [ "$OS" = "arch" ] || [ "$OS" = "manjaro" ]; then
            sudo pacman -S --noconfirm postgresql
        fi
        print_success "PostgreSQL installed"
    fi
else
    print_success "PostgreSQL installed"
fi

print_status "Checking Redis..."
if ! command -v redis-cli &> /dev/null; then
    print_warning "Redis not found"
    read -p "Install Redis? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
            sudo apt-get install -y redis-server
        elif [ "$OS" = "arch" ] || [ "$OS" = "manjaro" ]; then
            sudo pacman -S --noconfirm redis
        fi
        sudo systemctl enable redis
        sudo systemctl start redis
        print_success "Redis installed and started"
    fi
else
    print_success "Redis installed"
fi

print_status "Setting up environment..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success "Created .env from .env.example"
        print_warning "Please edit .env and add your ANTHROPIC_API_KEY"
    else
        print_error ".env.example not found"
        exit 1
    fi
else
    print_success ".env already exists"
fi

print_status "Installing Go dependencies..."
go mod download
go mod tidy
print_success "Dependencies installed"

print_status "Installing protoc Go plugins..."
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
print_success "Protoc plugins installed"

print_status "Generating gRPC code..."
chmod +x scripts/generate.sh
./scripts/generate.sh
print_success "gRPC code generated"

print_status "Setting up database..."
read -p "Create database 'ai'? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if psql -lqt | cut -d \| -f 1 | grep -qw ai; then
        print_warning "Database 'ai' already exists"
    else
        createdb ai
        print_success "Database 'ai' created"
    fi
    
    psql -d ai -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || print_warning "pgvector extension not available"
    print_success "Database setup complete"
fi

print_status "Building binary..."
make build
print_success "Binary built successfully"

print_status "Setting up systemd service..."
read -p "Install as systemd service? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    CURRENT_DIR=$(pwd)
    
    sed "s|/home/liora/your-project/lib/go|$CURRENT_DIR|g" liora-ai.service > /tmp/liora-ai.service
    sed -i "s|User=liora|User=$USER|g" /tmp/liora-ai.service
    sed -i "s|Group=liora|Group=$USER|g" /tmp/liora-ai.service
    
    sudo cp /tmp/liora-ai.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable liora-ai
    
    print_success "Systemd service installed"
    print_warning "Service not started yet. Start with: sudo systemctl start liora-ai"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Installation Complete! 🎉            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Edit .env and add your ANTHROPIC_API_KEY"
echo "2. Start the service:"
echo -e "   ${YELLOW}make run${NC}           # Run directly"
echo -e "   ${YELLOW}sudo systemctl start liora-ai${NC}  # Start as service"
echo ""
echo "3. Check status:"
echo -e "   ${YELLOW}make status${NC}        # Service status"
echo -e "   ${YELLOW}make logs${NC}          # View logs"
echo ""
echo "4. Test the service from your WhatsApp bot"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "- README.md for detailed usage"
echo "- make help for available commands"
echo ""
print_success "Happy coding! 🚀"