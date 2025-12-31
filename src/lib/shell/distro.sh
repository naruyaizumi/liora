#!/bin/bash

detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="$ID"
        OS_VERSION_ID="$VERSION_ID"
        OS_ID_LIKE="$ID_LIKE"
    else
        print_error "Cannot detect OS. /etc/os-release not found."
        exit 1
    fi
    
    case "$OS_ID" in
        ubuntu|debian|pop|linuxmint|elementary)
            DISTRO_BASE="debian"
            PKG_MANAGER="apt-get"
            PKG_UPDATE="apt-get update -qq"
            PKG_INSTALL="apt-get install -y"
            ;;
        arch|manjaro|endeavouros|garuda)
            DISTRO_BASE="arch"
            PKG_MANAGER="pacman"
            PKG_UPDATE="pacman -Sy --noconfirm"
            PKG_INSTALL="pacman -S --noconfirm"
            ;;
        fedora|rhel|centos|rocky|almalinux)
            DISTRO_BASE="redhat"
            PKG_MANAGER="dnf"
            PKG_UPDATE="dnf check-update -y || true"
            PKG_INSTALL="dnf install -y"
            ;;
        opensuse*|sles)
            DISTRO_BASE="suse"
            PKG_MANAGER="zypper"
            PKG_UPDATE="zypper refresh"
            PKG_INSTALL="zypper install -y"
            ;;
        gentoo)
            DISTRO_BASE="gentoo"
            PKG_MANAGER="emerge"
            PKG_UPDATE="emerge --sync"
            PKG_INSTALL="emerge -av"
            ;;
        alpine)
            DISTRO_BASE="alpine"
            PKG_MANAGER="apk"
            PKG_UPDATE="apk update"
            PKG_INSTALL="apk add"
            ;;
        void)
            DISTRO_BASE="void"
            PKG_MANAGER="xbps-install"
            PKG_UPDATE="xbps-install -S"
            PKG_INSTALL="xbps-install -y"
            ;;
        *)
        
            case "$OS_ID_LIKE" in
                *debian*)
                    DISTRO_BASE="debian"
                    PKG_MANAGER="apt-get"
                    PKG_UPDATE="apt-get update -qq"
                    PKG_INSTALL="apt-get install -y"
                    ;;
                *arch*)
                    DISTRO_BASE="arch"
                    PKG_MANAGER="pacman"
                    PKG_UPDATE="pacman -Sy --noconfirm"
                    PKG_INSTALL="pacman -S --noconfirm"
                    ;;
                *rhel*|*fedora*)
                    DISTRO_BASE="redhat"
                    PKG_MANAGER="dnf"
                    PKG_UPDATE="dnf check-update -y || true"
                    PKG_INSTALL="dnf install -y"
                    ;;
                *suse*)
                    DISTRO_BASE="suse"
                    PKG_MANAGER="zypper"
                    PKG_UPDATE="zypper refresh"
                    PKG_INSTALL="zypper install -y"
                    ;;
                *)
                    print_error "Unsupported distribution: $OS_ID"
                    print_info "Supported: Debian, Ubuntu, Arch, Fedora, RHEL, CentOS, Rocky, AlmaLinux, openSUSE, Gentoo, Alpine, Void"
                    exit 1
                    ;;
            esac
            ;;
    esac
}

validate_os() {
    print_info "Validating OS compatibility..."
    
    detect_distro
    
    print_success "OS detected: $OS_ID $OS_VERSION_ID (Base: $DISTRO_BASE)"
    print_info "Package manager: $PKG_MANAGER"
}

install_system_dependencies() {
    print_info "Installing system dependencies..."
    
    $PKG_UPDATE || {
        print_error "Failed to update package lists"
        exit 1
    }
    
    case "$DISTRO_BASE" in
        debian)
            $PKG_INSTALL \
                ffmpeg libwebp-dev libavformat-dev libavcodec-dev \
                libavutil-dev libswresample-dev libswscale-dev \
                libavfilter-dev build-essential python3 g++ \
                pkg-config cmake git curl unzip wget \
                ca-certificates gnupg lsb-release || {
                print_error "Failed to install system dependencies"
                exit 1
            }
            ;;
        arch)
            $PKG_INSTALL \
                ffmpeg libwebp base-devel python gcc \
                pkgconf cmake git curl unzip wget \
                ca-certificates gnupg || {
                print_error "Failed to install system dependencies"
                exit 1
            }
            ;;
        redhat)
            $PKG_INSTALL \
                ffmpeg-free libwebp-devel gcc gcc-c++ make \
                python3 pkgconfig cmake git curl unzip wget \
                ca-certificates gnupg redhat-lsb-core || {
                print_error "Failed to install system dependencies"
                exit 1
            }
            if command -v dnf &> /dev/null; then
                dnf install -y epel-release 2>/dev/null || true
            fi
            ;;
        suse)
            $PKG_INSTALL \
                ffmpeg libwebp-devel gcc gcc-c++ make \
                python3 pkg-config cmake git curl unzip wget \
                ca-certificates || {
                print_error "Failed to install system dependencies"
                exit 1
            }
            ;;
        gentoo)
            $PKG_INSTALL \
                media-video/ffmpeg media-libs/libwebp \
                sys-devel/gcc sys-devel/make dev-lang/python \
                dev-util/pkgconfig dev-util/cmake dev-vcs/git \
                net-misc/curl app-arch/unzip net-misc/wget \
                app-misc/ca-certificates || {
                print_error "Failed to install system dependencies"
                exit 1
            }
            ;;
        alpine)
            $PKG_INSTALL \
                ffmpeg libwebp-dev build-base python3 \
                pkgconfig cmake git curl unzip wget \
                ca-certificates || {
                print_error "Failed to install system dependencies"
                exit 1
            }
            ;;
        void)
            $PKG_INSTALL \
                ffmpeg libwebp-devel base-devel python3 \
                pkg-config cmake git curl unzip wget \
                ca-certificates || {
                print_error "Failed to install system dependencies"
                exit 1
            }
            ;;
    esac
    
    print_success "System dependencies installed"
}