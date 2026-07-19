#!/usr/bin/env bash
# Observal AV — install collector on Raspberry Pi OS (Lite)
set -euo pipefail

OBSERVAL_USER="${OBSERVAL_USER:-observal}"
INSTALL_DIR="/opt/observal"
DATA_DIR="/var/lib/observal"
CONFIG_DIR="/etc/observal"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo $0"
  exit 1
fi

echo "==> Installing system packages"
apt-get update -qq
apt-get install -y python3 python3-pip python3-venv snmp iputils-ping

echo "==> Creating user $OBSERVAL_USER"
id "$OBSERVAL_USER" &>/dev/null || useradd --system --home "$DATA_DIR" --shell /usr/sbin/nologin "$OBSERVAL_USER"

echo "==> Installing collector to $INSTALL_DIR"
mkdir -p "$INSTALL_DIR" "$DATA_DIR" "$CONFIG_DIR"
rsync -a --exclude '__pycache__' --exclude '.venv' \
  "$REPO_DIR/collector/" "$INSTALL_DIR/collector/" 2>/dev/null || \
  cp -a "$REPO_DIR/collector/." "$INSTALL_DIR/collector/"

python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install -q --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install -q -e "$INSTALL_DIR/collector"

echo "==> Config"
if [[ ! -f "$CONFIG_DIR/observal.env" ]]; then
  cp "$REPO_DIR/collector/config/observal.env.example" "$CONFIG_DIR/observal.env"
  echo "Edit $CONFIG_DIR/observal.env with your SUPABASE_URL"
fi

if [[ ! -f "$CONFIG_DIR/identity.json" ]]; then
  echo "WARNING: $CONFIG_DIR/identity.json missing."
  echo "         Run factory/preload-identity.py before shipping the device."
fi

chmod 700 "$CONFIG_DIR" "$DATA_DIR"
chmod 600 "$CONFIG_DIR"/* 2>/dev/null || true
chown -R "$OBSERVAL_USER:$OBSERVAL_USER" "$DATA_DIR"

echo "==> systemd"
cp "$REPO_DIR/collector/systemd/observal-collector.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable observal-collector.service

echo ""
echo "Installation complete."
echo "  1. Set SUPABASE_URL in $CONFIG_DIR/observal.env"
echo "  2. Place identity.json in $CONFIG_DIR/identity.json (from factory)"
echo "  3. sudo systemctl start observal-collector"
echo "  4. sudo journalctl -u observal-collector -f"
