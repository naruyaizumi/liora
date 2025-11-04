#!/bin/bash
clear

BORDER="-------------------------------------------------"
line() { echo "$BORDER"; }

HOSTNAME=$(hostname)
KERNEL=$(uname -r)
ARCH=$(uname -m)
DATE=$(date)
NODE_VERSION=$(node -v)
INTERNAL_IP=$(ip route get 1 | awk '{print $(NF-2);exit}')
OS_NAME=$(grep ^PRETTY_NAME= /etc/os-release | cut -d= -f2 | tr -d '"')
UPTIME=$(uptime -p)
LOAD=$(uptime | awk -F'load average:' '{print $2}' | xargs)
MEM_USED=$(free -m | awk '/Mem:/ {print $3}')
MEM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
DISK_USED=$(df -h / | awk 'NR==2 {print $3}')
DISK_TOTAL=$(df -h / | awk 'NR==2 {print $2}')
SHELL_NAME=$(basename "$SHELL")
BASH_VER=$BASH_VERSION
TERMINAL=${TERM:-unknown}
CPU_MODEL=$(lscpu | grep "Model name" | sed -E 's/Model name:\s+//g' | head -n1)
CPU_CORES=$(nproc)
PROCS=$(ps -e --no-headers | wc -l)
USERS=$(who | wc -l)
PUBLIC_IP=$(curl -s ifconfig.me || echo "N/A")
PKG_COUNT=$(dpkg -l 2>/dev/null | grep '^ii' | wc -l)
if [ -z "$PKG_COUNT" ] || [ "$PKG_COUNT" -eq 0 ]; then
  if command -v rpm &>/dev/null; then
    PKG_COUNT=$(rpm -qa | wc -l)
  elif command -v apk &>/dev/null; then
    PKG_COUNT=$(apk info | wc -l)
  else
    PKG_COUNT="N/A"
  fi
fi

find . -exec touch {} + 2>/dev/null

line
echo " Welcome to $OS_NAME"
echo " Kernel   : $KERNEL $ARCH"
echo " Hostname : $HOSTNAME"
echo " Date     : $DATE"
line
echo " System Information:"
echo "   Uptime   : $UPTIME"
echo "   Load     : $LOAD"
echo "   Memory   : ${MEM_USED}MB / ${MEM_TOTAL}MB"
echo "   Disk     : ${DISK_USED} / ${DISK_TOTAL}"
echo "   Node.js  : $NODE_VERSION"
echo "   Shell    : $SHELL_NAME $BASH_VER"
echo "   Terminal : $TERMINAL"
echo "   Packages : $PKG_COUNT"
echo "   Internal : $INTERNAL_IP"
echo "   CPU      : $CPU_MODEL ($CPU_CORES cores)"
echo "   Procs    : $PROCS running"
echo "   Users    : $USERS logged in"
echo "   PublicIP : $PUBLIC_IP"
line
echo " * Maintainer : Naruya Izumi"
echo " * GitHub     : https://github.com/naruyaizumi"
echo " * Social     : https://linkbio.co/naruyaizumi"
line

MODIFIED_STARTUP=$(echo -e ${STARTUP} | sed -e 's/{{/${/g' -e 's/}}/}/g')
eval ${MODIFIED_STARTUP}