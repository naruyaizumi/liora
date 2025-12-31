use serde::Deserialize;
use std::env;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub database_url: String,
    pub pg_pool_size: u32,
    pub pg_pool_timeout: u64,
    pub http_host: String,
    pub http_port: u16,
    pub cache_max_size: usize,
    pub cache_ttl_secs: u64,
    pub buffer_max_ops: usize,
    pub buffer_flush_ms: u64,
    pub max_crashes: u32,
    pub crash_window_secs: u64,
    pub cooldown_secs: u64,
    pub restart_delay_secs: u64,
    pub shutdown_timeout_secs: u64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            database_url: "postgresql://liora:secure_pass@localhost:5432/liora"
                .to_string(),
            pg_pool_size: 20,
            pg_pool_timeout: 30,
            http_host: "127.0.0.1".to_string(),
            http_port: 8080,
            cache_max_size: 10000,
            cache_ttl_secs: 300,
            buffer_max_ops: 100,
            buffer_flush_ms: 200,
            max_crashes: 5,
            crash_window_secs: 60,
            cooldown_secs: 10,
            restart_delay_secs: 2,
            shutdown_timeout_secs: 8,
        }
    }
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        dotenv::dotenv().ok();

        Ok(Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| Config::default().database_url),
            pg_pool_size: env::var("PG_POOL_SIZE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(Config::default().pg_pool_size),
            pg_pool_timeout: env::var("PG_POOL_TIMEOUT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(Config::default().pg_pool_timeout),
            http_host: env::var("HTTP_HOST")
                .unwrap_or_else(|_| Config::default().http_host),
            http_port: env::var("HTTP_PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(Config::default().http_port),
            cache_max_size: env::var("CACHE_MAX_SIZE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(Config::default().cache_max_size),
            cache_ttl_secs: env::var("CACHE_TTL_SECS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(Config::default().cache_ttl_secs),
            buffer_max_ops: env::var("BUFFER_MAX_OPS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(Config::default().buffer_max_ops),
            buffer_flush_ms: env::var("BUFFER_FLUSH_MS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(Config::default().buffer_flush_ms),
            max_crashes: env::var("MAX_CRASHES")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(Config::default().max_crashes),
            crash_window_secs: env::var("CRASH_WINDOW_SECS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(Config::default().crash_window_secs),
            cooldown_secs: env::var("COOLDOWN_SECS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(Config::default().cooldown_secs),
            restart_delay_secs: env::var("RESTART_DELAY_SECS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(Config::default().restart_delay_secs),
            shutdown_timeout_secs: env::var("SHUTDOWN_TIMEOUT_SECS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(Config::default().shutdown_timeout_secs),
        })
    }
}