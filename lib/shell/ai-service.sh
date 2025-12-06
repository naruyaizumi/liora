#!/bin/bash
set -euo pipefail

print_info(){ echo "[INFO] $1"; }
print_ok(){ echo "[OK] $1"; }
print_err(){ echo "[ERROR] $1"; }
print_warn(){ echo "[WARN] $1"; }

INSTALL_DIR="${INSTALL_DIR:-/opt/liora-ai}"
BIN_DIR="${BIN_DIR:-/usr/local/bin}"
SERVICE_NAME="${SERVICE_NAME:-liora-ai}"
VENV_DIR="$INSTALL_DIR/.venv"
PYTHON_BIN="$VENV_DIR/bin/python3"

ensure_root() {
  if [ "$EUID" -ne 0 ]; then
    print_err "This script must be run as root"
    exit 1
  fi
}

ensure_root

print_info "Creating systemd service for $SERVICE_NAME"

SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Liora AI gRPC Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$PYTHON_BIN $INSTALL_DIR/lib/py/ai.py
Restart=always
RestartSec=5
LimitNOFILE=65536
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF

print_ok "Service file written: $SERVICE_FILE"

print_info "Reloading systemd and enabling service"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
print_ok "Service enabled (not started). Use: systemctl start $SERVICE_NAME"

CLI="$BIN_DIR/ai"
if [ ! -f "$CLI" ]; then
  print_info "Creating ai CLI helper at $CLI"
  cat > "$CLI" <<'EOFCLI'
#!/bin/bash

SERVICE_NAME="liora-ai"

case "$1" in
  start) systemctl start $SERVICE_NAME ;;
  stop) systemctl stop $SERVICE_NAME ;;
  restart) systemctl restart $SERVICE_NAME ;;
  status) systemctl status $SERVICE_NAME --no-pager ;;
  log) journalctl -u $SERVICE_NAME -f ;;
  logs) journalctl -u $SERVICE_NAME -n 200 --no-pager ;;
  test)
      /opt/liora-ai/.venv/bin/python3 /opt/liora-ai/lib/py/ai.py
      ;;
  *)
      echo "Usage: ai {start|stop|restart|status|log|logs|test}"
      ;;
esac
EOFCLI
  chmod +x "$CLI"
  print_ok "CLI helper created"
else
  print_ok "CLI helper already exists"
fi

print_ok "ai-service setup complete"