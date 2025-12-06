#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info(){ echo -e "${BLUE}[~]${NC} $1"; }
print_ok(){ echo -e "${GREEN}[✓]${NC} $1"; }
print_err(){ echo -e "${RED}[✗]${NC} $1"; }
print_warn(){ echo -e "${YELLOW}[!]${NC} $1"; }

INSTALL_DIR="${INSTALL_DIR:-/opt/liora-ai}"
SRC_DIR="${WORK_DIR:-/root/liora}"
PROTO_SRC="${SRC_DIR}/lib/protos/ai.proto"
PYTHON_BIN="${PYTHON_BIN:-/usr/bin/python3}"
VENV_DIR="$INSTALL_DIR/.venv"

ensure_root() {
  if [ "$EUID" -ne 0 ]; then
    print_err "This script must be run as root"
    exit 1
  fi
}

ensure_root

print_info "Creating install directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
chown -R "$(whoami)" "$INSTALL_DIR"

print_info "Copying AI server files into $INSTALL_DIR"
if [ -d "$SRC_DIR" ]; then
  rsync -a --exclude node_modules "$SRC_DIR/" "$INSTALL_DIR/"
else
  print_warn "Source repo not found at $SRC_DIR - ensure you have project files available"
fi

cd "$INSTALL_DIR"

print_info "Checking Python availability..."
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  print_info "Installing Python 3..."
  apt-get update -qq
  apt-get install -y -qq python3 python3-venv python3-pip
fi
print_ok "Python: $($PYTHON_BIN --version 2>&1 | head -n1)"

print_info "Creating virtualenv at $VENV_DIR"
if [ ! -d "$VENV_DIR" ]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

print_info "Upgrading pip and installing Python requirements"
pip install --upgrade pip setuptools wheel
REQ_FILE="lib/py/requirements.txt"
if [ -f "$REQ_FILE" ]; then
  pip install -r "$REQ_FILE"
else
  print_warn "Requirements file not found: $REQ_FILE - installing minimal deps"
  pip install grpcio grpcio-tools openai redis psycopg[binary] python-dotenv
fi
print_ok "Python dependencies installed"

if [ -f "$PROTO_SRC" ]; then
  print_info "Generating Python gRPC stubs from $PROTO_SRC"
  python3 -m grpc_tools.protoc -I"$(dirname "$PROTO_SRC")" --python_out=lib/py --grpc_python_out=lib/py "$PROTO_SRC"
  print_ok "gRPC Python stubs generated"
else
  print_warn "Proto file not found at $PROTO_SRC - skipping gRPC stub generation"
fi

if [ -f "lib/py/ai.py" ]; then
  chmod +x lib/py/ai.py
fi

print_info "Validating AI server startup (dry run)"
if command -v timeout >/dev/null 2>&1; then
  timeout 5s bash -c "source \"$VENV_DIR/bin/activate\" && python3 lib/py/ai.py" >/dev/null 2>&1 || true
fi

print_ok "AI server prepared in $INSTALL_DIR (vENV: $VENV_DIR)"

deactivate 2>/dev/null || true