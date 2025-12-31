#!/bin/bash

install_postgresql() {
    print_info "Installing PostgreSQL..."
    
    if command -v psql &> /dev/null; then
        print_info "PostgreSQL already installed"
        systemctl enable postgresql 2>/dev/null || systemctl enable postgresql.service 2>/dev/null || true
        systemctl start postgresql 2>/dev/null || systemctl start postgresql.service 2>/dev/null || true
        return 0
    fi
    
    case "$DISTRO_BASE" in
        debian)
            sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list' 2>/dev/null || true
            wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - 2>/dev/null || true
            $PKG_UPDATE
            $PKG_INSTALL postgresql-18 postgresql-contrib-18 || {
                print_error "Failed to install PostgreSQL"
                exit 1
            }
            ;;
        arch)
            $PKG_INSTALL postgresql || {
                print_error "Failed to install PostgreSQL"
                exit 1
            }
            su - postgres -c "initdb -D /var/lib/postgres/data" 2>/dev/null || true
            ;;
        redhat)
            $PKG_INSTALL postgresql-server postgresql-contrib || {
                print_error "Failed to install PostgreSQL"
                exit 1
            }
            postgresql-setup --initdb 2>/dev/null || postgresql-setup initdb 2>/dev/null || true
            ;;
        suse)
            $PKG_INSTALL postgresql-server postgresql-contrib || {
                print_error "Failed to install PostgreSQL"
                exit 1
            }
            ;;
        gentoo)
            $PKG_INSTALL dev-db/postgresql || {
                print_error "Failed to install PostgreSQL"
                exit 1
            }
            emerge --config dev-db/postgresql 2>/dev/null || true
            ;;
        alpine)
            $PKG_INSTALL postgresql postgresql-contrib || {
                print_error "Failed to install PostgreSQL"
                exit 1
            }
            su - postgres -c "initdb -D /var/lib/postgresql/data" 2>/dev/null || true
            ;;
        void)
            $PKG_INSTALL postgresql || {
                print_error "Failed to install PostgreSQL"
                exit 1
            }
            ;;
    esac
    
    systemctl enable postgresql 2>/dev/null || systemctl enable postgresql.service 2>/dev/null || true
    systemctl start postgresql 2>/dev/null || systemctl start postgresql.service 2>/dev/null || true
    
    print_info "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if systemctl is-active --quiet postgresql 2>/dev/null || systemctl is-active --quiet postgresql.service 2>/dev/null; then
            if sudo -u postgres psql -c "SELECT 1;" &>/dev/null; then
                break
            fi
        fi
        if [ "$i" -eq 30 ]; then
            print_error "PostgreSQL failed to start or become ready"
            exit 1
        fi
        sleep 1
    done
    
    PG_VERSION=$(psql -V | awk '{print $3}' | cut -d. -f1)
    print_success "PostgreSQL $PG_VERSION installed and running"
}

setup_postgresql_database() {
    print_info "Setting up PostgreSQL database..."
    
    USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null || echo "0")
    if [ "$USER_EXISTS" != "1" ]; then
        sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || {
            print_error "Failed to create database user"
            exit 1
        }
        print_success "Database user '$DB_USER' created"
    else
        print_info "User '$DB_USER' already exists, updating password..."
        sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || {
            print_error "Failed to update database user password"
            exit 1
        }
    fi
    
    DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "0")
    if [ "$DB_EXISTS" = "1" ]; then
        print_info "Database '$DB_NAME' already exists"
    else
        sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || {
            print_error "Failed to create database"
            exit 1
        }
        
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || {
            print_error "Failed to grant privileges"
            exit 1
        }
        
        print_success "Database '$DB_NAME' created successfully"
    fi
}

configure_postgresql_auth() {
    print_info "Configuring PostgreSQL authentication..."
    
    PG_HBA_CONF=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;' 2>/dev/null | tr -d '[:space:]')
    
    if [ -z "$PG_HBA_CONF" ]; then
        for conf in /etc/postgresql/*/main/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf /var/lib/postgresql/data/pg_hba.conf; do
            if [ -f "$conf" ]; then
                PG_HBA_CONF="$conf"
                break
            fi
        done
    fi
    
    if [ -z "$PG_HBA_CONF" ] || [ ! -f "$PG_HBA_CONF" ]; then
        print_warning "pg_hba.conf not found, skipping authentication configuration"
        return 0
    fi
    
    cp "$PG_HBA_CONF" "${PG_HBA_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    
    if ! grep -q "^host[[:space:]]*${DB_NAME}[[:space:]]*${DB_USER}[[:space:]]*127.0.0.1/32[[:space:]]*md5" "$PG_HBA_CONF"; then
        print_info "Adding authentication rule for database user..."
        echo "host    ${DB_NAME}    ${DB_USER}    127.0.0.1/32    md5" >> "$PG_HBA_CONF"
        
        systemctl reload postgresql 2>/dev/null || systemctl reload postgresql.service 2>/dev/null || {
            print_error "Failed to reload PostgreSQL"
            exit 1
        }
        
        print_info "Waiting for PostgreSQL to apply new configuration..."
        sleep 5
        
        for i in {1..10}; do
            if sudo -u postgres psql -c "SELECT 1;" &>/dev/null; then
                break
            fi
            if [ "$i" -eq 10 ]; then
                print_error "PostgreSQL not responsive after reload"
                exit 1
            fi
            sleep 1
        done
    else
        print_info "Authentication rule already exists"
    fi
}

test_postgresql_connection() {
    export PGPASSWORD="$DB_PASSWORD"
    print_info "Testing database connection..."
    CONNECTION_SUCCESS=false
    
    for i in {1..15}; do
        if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
            print_success "Database connection test successful"
            CONNECTION_SUCCESS=true
            break
        fi
        if [ "$i" -lt 15 ]; then
            print_info "Retrying database connection (attempt $i/15)..."
            sleep 2
        fi
    done
    
    unset PGPASSWORD
    
    if [ "$CONNECTION_SUCCESS" = false ]; then
        print_error "Database connection test failed after 15 attempts"
        print_info "Checking PostgreSQL logs..."
        journalctl -u postgresql -n 20 --no-pager 2>/dev/null || true
        exit 1
    fi
}