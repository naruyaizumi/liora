#!/bin/bash

print_error() {
    echo "[ERROR] $1" >&2
}

print_success() {
    echo "[SUCCESS] $1"
}

print_info() {
    echo "[INFO] $1"
}

print_warning() {
    echo "[WARNING] $1"
}

print_step() {
    echo ""
    echo "=========================================="
    echo " $1"
    echo "=========================================="
    echo ""
}