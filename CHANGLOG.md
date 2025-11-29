# Changelog

All notable changes to Liora will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [8.0.0]

### 🚨 **BREAKING CHANGES - Major Architecture Overhaul**

This is a **major breaking release** that fundamentally changes the Liora architecture. Migration from 7.x requires reconfiguration.

### ⚡ **Core Architecture Changes**

#### **Runtime Migration: JavaScript Parent → Rust Supervisor**

- **BREAKING**: Complete runtime architecture overhaul
- **NEW**: Rust-based supervisor process as parent
  - Full async implementation using Tokio runtime
  - Native signal handling (SIGTERM/SIGINT/SIGHUP)
  - Automatic crash recovery with exponential backoff
  - Memory-efficient process management
- **NEW**: JavaScript/Bun child process for bot logic
  - Managed lifecycle by Rust supervisor
  - Hot-restart capability without data loss
  - Graceful shutdown with state preservation

#### **Database & Caching Layer**

- **NEW**: PostgreSQL session management
  - Persistent authentication state
  - Connection pooling (configurable: 20-50 connections)
  - Automatic retry logic with exponential backoff
  - Transaction support for atomic operations
- **NEW**: Redis cache layer
  - Connection pooling (configurable: 10-30 connections)
  - 18 Baileys events now cached:
    - `connection.update`
    - `creds.update`
    - `messages.upsert`
    - `messages.update`
    - `messages.delete`
    - `message-receipt.update`
    - `presence.update`
    - `chats.upsert`
    - `chats.update`
    - `chats.delete`
    - `contacts.upsert`
    - `contacts.update`
    - `groups.upsert`
    - `groups.update`
    - `group-participants.update`
    - `blocklist.set`
    - `blocklist.update`
    - `call`
  - TTL-based cache invalidation (configurable per event type)
  - Automatic cache warming on startup
  - Pipeline optimization for batch operations

#### **Event Processing Pipeline**

- **NEW**: Full async event processing
  - P-Queue integration for rate limiting
  - EventEmitter3 for high-performance event dispatching
  - Concurrent operation control (max 30 parallel ops)
  - Batch processing with delay (50ms default)
  - Circuit breaker pattern for external services
- **NEW**: Worker-based processing
  - Bun Worker threads for CPU-intensive tasks
  - Separate worker pool for media processing
  - Non-blocking I/O for all operations

#### **HTTP Bridge Layer**

- **NEW**: Rust HTTP server for Baileys communication
  - High-performance Axum web framework
  - WebSocket support for real-time events
  - RESTful API for command execution
  - Health check endpoints
  - Metrics exposure (Prometheus-compatible)

#### **C++ Addon Improvements**

- **REFACTOR**: Complete migration to async N-API workers
  - Raw N-API implementation (no NAN dependency)
  - Worker pool for parallel processing
  - Non-blocking audio conversion (FFmpeg)
  - Non-blocking sticker processing (libwebp)
  - Zero-copy buffer transfers where possible

### 🗑️ **Removed (Breaking)**

- **REMOVED**: Legacy in-RAM storage system
  - All data now persisted to PostgreSQL/Redis
  - Migration script not provided (breaking change)
- **REMOVED**: Old JavaScript start script
  - Replaced by Rust supervisor
  - New startup command: `lib/rs/target/release/liora-rs`
- **REMOVED**: `ws` package dependency
  - Using native Bun WebSocket implementation
  - ~5MB smaller bundle size
  - Better performance and stability
- **REMOVED**: `sendStickerPack` feature
  - Deprecated API endpoint
  - No replacement provided

### ✨ **Added**

- HTTP API endpoints:
  - `GET /health` - Service health check
  - `GET /metrics` - Prometheus metrics
  - `POST /restart` - Hot restart without data loss
  - `GET /status` - Current bot status
- Configuration options:
  - `PG_POOL_SIZE` - PostgreSQL connection pool size
  - `REDIS_POOL_SIZE` - Redis connection pool size
  - `MAX_CONCURRENT_OPS` - Max parallel operations
  - `CACHE_TTL_SECS` - Default cache TTL
  - `CIRCUIT_BREAKER_THRESHOLD` - Circuit breaker limit
  - `HEALTH_CHECK_INTERVAL` - Health check frequency
- Environment variables for fine-tuning:
  - Per-event cache TTL configuration
  - Retry policies for DB/Redis operations
  - Timeout configurations
  - Logging levels per component

### 🔧 **Fixed**

- **Audio Waveform in PTT (Voice Note)**
  - Full Bun runtime compatibility
  - Async worker processing
  - Memory leak fixes
- **HD/Remini Media Enhancement**
  - Improved stability with worker threads
  - Better error handling
  - Timeout protection
- **Block/Unblock Reply Handling**
  - Consistent behavior across sessions
  - Proper state synchronization with cache
- **Signal Handling**
  - Proper SIGTERM/SIGINT propagation
  - Graceful shutdown with timeout
  - No orphaned processes

### 🚀 **Performance Improvements**

- **Startup Time**: ~40% faster (2.5s → 1.5s avg)
- **Memory Usage**: ~25% reduction (persistent storage vs RAM)
- **Message Processing**: ~60% faster (async pipeline)
- **Cache Hit Rate**: 85-95% for common operations
- **Connection Stability**: 99.9% uptime (with auto-recovery)

### 📦 **Dependencies**

#### Updated
- `baileys`: github:naruyaizumi/baileys#main (latest)
- `pino`: ^9.x → ^10.1.0
- `pino-pretty`: ^11.x → ^13.1.2
- `canvas`: ^3.0.0 → ^3.2.0
- `sharp`: ^0.33.x → ^0.34.4

#### Added
- `async-mutex`: ^0.5.0
- `eventemitter3`: ^5.0.1
- `p-queue`: ^9.0.1

#### Removed
- `ws`: (using native Bun WebSocket)
- `node-cache`: (replaced by Redis)

### 🔐 **Security**

- All secrets now loaded from environment variables only
- No hardcoded credentials in source code
- PostgreSQL connections use SSL by default (configurable)
- Redis connections support TLS
- Input sanitization for all external inputs
- Rate limiting on all API endpoints

### 📚 **Documentation**

- Architecture documentation updated
- API reference for HTTP endpoints
- Configuration guide with all options
- Migration guide from 7.x (separate doc)
- Performance tuning guide

### 🐛 **Known Issues**

- Hot-restart may occasionally timeout on very slow systems (>30s)
- Cache warming can take 2-5 seconds on first startup
- PostgreSQL migration from 7.x requires manual data export/import

### 🙏 **Acknowledgments**

Special thanks to all contributors who helped make this major release possible:
- The Baileys community for WhatsApp protocol insights
- Bun team for runtime improvements
- Tokio maintainers for excellent async runtime

### 🔗 **Links**

- **Full Changelog**: https://github.com/naruyaizumi/liora/compare/v7.6.5...v8.0.0
- **Issues**: https://github.com/naruyaizumi/liora/issues
- **Discussions**: https://github.com/naruyaizumi/liora/discussions

---

## Support

⭐ **Star the project** if you find it useful!  
🐛 **Report bugs**: https://github.com/naruyaizumi/liora/issues  
💬 **Get help**: https://github.com/naruyaizumi/liora/discussions

🔗 https://github.com/naruyaizumi/liora