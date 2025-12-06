#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROTO_DIR="$(cd "$PROJECT_ROOT/../protos" && pwd)"
PB_DIR="$PROJECT_ROOT/pb"

echo "🔧 Generating gRPC code for Go..."
echo "Project root: $PROJECT_ROOT"
echo "Proto dir: $PROTO_DIR"
echo "Output dir: $PB_DIR"

# Create pb directory if it doesn't exist
mkdir -p "$PB_DIR"

# Check if protoc is installed
if ! command -v protoc &> /dev/null; then
    echo "❌ protoc not found. Please install Protocol Buffers compiler."
    echo "   On Ubuntu/Debian: sudo apt install -y protobuf-compiler"
    echo "   On macOS: brew install protobuf"
    exit 1
fi

# Check if Go plugins are installed
if ! command -v protoc-gen-go &> /dev/null; then
    echo "Installing protoc-gen-go..."
    go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
fi

if ! command -v protoc-gen-go-grpc &> /dev/null; then
    echo "Installing protoc-gen-go-grpc..."
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
fi

# Ensure Go bin is in PATH
export PATH="$PATH:$(go env GOPATH)/bin"

# Generate Go code
cd "$PROJECT_ROOT"
protoc \
  --proto_path="$PROTO_DIR" \
  --go_out="$PB_DIR" \
  --go_opt=paths=source_relative \
  --go-grpc_out="$PB_DIR" \
  --go-grpc_opt=paths=source_relative \
  "$PROTO_DIR/ai.proto"

echo "✅ gRPC Go code generated successfully!"
echo "   Generated files:"
echo "   - $PB_DIR/ai.pb.go"
echo "   - $PB_DIR/ai_grpc.pb.go"