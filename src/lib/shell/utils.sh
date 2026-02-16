#!/bin/bash
# Utility functions and completion message

create_cli() {
    if [ "$PROCESS_MANAGER" = "systemd" ]; then
        source <(declare -f create_cli_systemd)
        create_cli_systemd
    elif [ "$PROCESS_MANAGER" = "pm2" ]; then
        source <(declare -f create_cli_pm2)
        create_cli_pm2
    fi
}

show_completion() {
    CURRENT=$(cat "$WORK_DIR/.current_version" 2>/dev/null || echo "unknown")
    BUN_VER=$("$BUN_PATH" --version 2>/dev/null || echo "unknown")
    
    cat << EOF

================================================================================
                        Installation Complete
================================================================================

System Information
------------------
OS:              $OS_ID $OS_VERSION
Process Manager: $PROCESS_MANAGER
Liora Version:   $CURRENT
Bun Runtime:     v$BUN_VER

Installation Paths
------------------
Directory:       $WORK_DIR
Config:          $WORK_DIR/.env
Logs:            $WORK_DIR/logs/
Monitor:         $WORK_DIR/monitor.sh
CLI:             /usr/local/bin/bot

Quick Start
-----------
1. Start the bot:
   $ bot start

2. View logs:
   $ bot log

3. Check status:
   $ bot status

Available Commands
------------------
Control:    bot start, stop, restart, status
Logs:       bot log, tail
Config:     bot config
Maintain:   bot update, backup, restore, clean
Monitor:    bot stats, health, monitor

EOF

    if [ "$PROCESS_MANAGER" = "pm2" ]; then
        echo "PM2 Specific:"
        echo "  bot reload, list, monit, save, startup"
        echo ""
    fi

    cat << EOF
Setup Monitoring (Optional)
----------------------------
Add to crontab for automated health checks:
$ crontab -e

Add this line:
*/5 * * * * /root/liora/monitor.sh

Documentation
-------------
Repository: https://github.com/naruyaizumi/liora
Issues:     https://github.com/naruyaizumi/liora/issues

================================================================================

EOF
}