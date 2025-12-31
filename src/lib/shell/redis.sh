#!/bin/bash

install_redis() {
    print_info "Installing Redis..."
    
    if command -v redis-server &> /dev/null; then
        print_info "Redis already installed"
    else
        case "$DISTRO_BASE" in
            debian)
                $PKG_INSTALL redis-server || {
                    print_error "Failed to install Redis"
                    exit 1
                }
                ;;
            arch)
                $PKG_INSTALL redis || {
                    print_error "Failed to install Redis"
                    exit 1
                }
                ;;
            redhat)
                $PKG_INSTALL redis || {
                    print_error "Failed to install Redis"
                    exit 1
                }
                ;;
            suse)
                $PKG_INSTALL redis || {
                    print_error "Failed to install Redis"
                    exit 1
                }
                ;;
            gentoo)
                $PKG_INSTALL dev-db/redis || {
                    print_error "Failed to install Redis"
                    exit 1
                }
                ;;
            alpine)
                $PKG_INSTALL redis || {
                    print_error "Failed to install Redis"
                    exit 1
                }
                ;;
            void)
                $PKG_INSTALL redis || {
                    print_error "Failed to install Redis"
                    exit 1
                }
                ;;
        esac
    fi
}

configure_redis() {
    print_info "Configuring Redis..."
    
    REDIS_CONF=""
    for conf in /etc/redis/redis.conf /etc/redis.conf /usr/local/etc/redis.conf; do
        if [ -f "$conf" ]; then
            REDIS_CONF="$conf"
            break
        fi
    done
    
    if [ -z "$REDIS_CONF" ] || [ ! -f "$REDIS_CONF" ]; then
        print_warning "Redis configuration file not found, skipping configuration"
        systemctl enable redis 2>/dev/null || systemctl enable redis-server 2>/dev/null || true
        systemctl restart redis 2>/dev/null || systemctl restart redis-server 2>/dev/null || true
        return 0
    fi
    
    cp "$REDIS_CONF" "${REDIS_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    
    set_redis_config() {
        local key="$1"
        local value="$2"
        local pattern="$3"
        
        if grep -q "^${key}" "$REDIS_CONF"; then
            sed -i "s|^${key}.*|${key} ${value}|" "$REDIS_CONF"
        elif grep -q "^# *${pattern}" "$REDIS_CONF"; then
            sed -i "s|^# *${pattern}|${key} ${value}|" "$REDIS_CONF"
        else
            echo "${key} ${value}" >> "$REDIS_CONF"
        fi
    }
    
    set_redis_config "maxmemory" "256mb" "maxmemory <bytes>"
    set_redis_config "maxmemory-policy" "allkeys-lru" "maxmemory-policy noeviction"
    
    sed -i 's/^save 900 1/# save 900 1/' "$REDIS_CONF" 2>/dev/null || true
    sed -i 's/^save 300 10/# save 300 10/' "$REDIS_CONF" 2>/dev/null || true
    
    if ! grep -q "^save 60 10000" "$REDIS_CONF"; then
        sed -i 's/^# *save 60 10000/save 60 10000/' "$REDIS_CONF" 2>/dev/null || \
            echo "save 60 10000" >> "$REDIS_CONF"
    fi
    
    set_redis_config "appendonly" "yes" "appendonly no"
    set_redis_config "appendfsync" "everysec" "appendfsync everysec"
    
    print_success "Redis configuration updated"
    
    systemctl enable redis 2>/dev/null || systemctl enable redis-server 2>/dev/null || true
    systemctl restart redis 2>/dev/null || systemctl restart redis-server 2>/dev/null || true
}

test_redis_connection() {
    print_info "Waiting for Redis to be ready..."
    for i in {1..30}; do
        if systemctl is-active --quiet redis 2>/dev/null || systemctl is-active --quiet redis-server 2>/dev/null; then
            if redis-cli ping &>/dev/null; then
                break
            fi
        fi
        if [ "$i" -eq 30 ]; then
            print_error "Redis failed to start"
            journalctl -u redis -n 20 --no-pager 2>/dev/null || journalctl -u redis-server -n 20 --no-pager 2>/dev/null || true
            exit 1
        fi
        sleep 1
    done
    
    if redis-cli ping | grep -q "PONG"; then
        print_success "Redis installed and running"
    else
        print_error "Redis connection test failed"
        exit 1
    fi
    
    REDIS_VERSION=$(redis-server --version | awk '{print $3}' | cut -d= -f2)
    print_success "Redis $REDIS_VERSION installed successfully"
}