use anyhow::{Context, Result};
use dashmap::DashMap;
use deadpool_postgres::{Config as PoolConfig, Pool, Runtime, ManagerConfig, RecyclingMethod};
use tokio_postgres::NoTls;
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::{debug, info, warn};
use crate::config::Config;

type PgPool = Pool;

pub struct AuthService {
    pool: Arc<PgPool>,
    cache: Arc<DashMap<String, CachedValue>>,
    config: Config,
}

#[derive(Clone)]
struct CachedValue {
    data: String,
    expires_at: Instant,
    last_accessed: Instant,
}

impl CachedValue {
    fn is_valid(&self) -> bool {
        self.expires_at > Instant::now()
    }
}

impl AuthService {
    pub async fn new(config: Config) -> Result<Self> {
        let mut pg_config = PoolConfig::new();
        pg_config.url = Some(config.database_url.clone());
        
        pg_config.manager = Some(ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        });
        
        pg_config.pool = Some(deadpool_postgres::PoolConfig {
            max_size: config.pg_pool_size as usize,
            timeouts: deadpool_postgres::Timeouts {
                wait: Some(Duration::from_secs(config.pg_pool_timeout)),
                create: Some(Duration::from_secs(config.pg_pool_timeout)),
                recycle: Some(Duration::from_secs(config.pg_pool_timeout)),
            },
            ..Default::default()
        });
        
        let pool = pg_config
            .create_pool(Some(Runtime::Tokio1), NoTls)
            .context("Failed to create connection pool")?;

        let client = pool.get().await.context("Failed to get test connection")?;
        client.execute("SELECT 1", &[])
            .await
            .context("Database connection test failed")?;

        info!(
            "PostgreSQL connected: pool_size={}, timeout={}s",
            config.pg_pool_size, config.pg_pool_timeout
        );

        let service = Self {
            pool: Arc::new(pool),
            cache: Arc::new(DashMap::new()),
            config,
        };

        service.start_cache_cleanup_task();

        Ok(service)
    }

    pub async fn init_schema(&self) -> Result<()> {
        let client = self.pool.get().await.context("Failed to get database connection")?;

        client.execute(
            "CREATE TABLE IF NOT EXISTS baileys_auth (
                key TEXT PRIMARY KEY CHECK (length(key) > 0 AND length(key) < 512),
                data JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )",
            &[],
        ).await.context("Failed to create baileys_auth table")?;

        client.execute(
            "CREATE INDEX IF NOT EXISTS idx_baileys_auth_updated 
             ON baileys_auth(updated_at DESC)",
            &[],
        ).await.context("Failed to create updated_at index")?;

        client.execute(
            "CREATE INDEX IF NOT EXISTS idx_baileys_auth_key_pattern 
             ON baileys_auth(key text_pattern_ops) 
             WHERE key LIKE '%-%'",
            &[],
        ).await.context("Failed to create key pattern index")?;

        info!("Database schema initialized");
        Ok(())
    }

    pub async fn get(&self, key: &str) -> Result<Option<String>> {
        if let Some(mut cached) = self.cache.get_mut(key) {
            if cached.is_valid() {
                cached.last_accessed = Instant::now();
                debug!("Cache hit: {}", key);
                return Ok(Some(cached.data.clone()));
            } else {
                drop(cached);
                self.cache.remove(key);
                debug!("Cache expired: {}", key);
            }
        }

        let client = self.pool.get().await.context("Failed to get database connection")?;
        let stmt = client
            .prepare_cached("SELECT data FROM baileys_auth WHERE key = $1")
            .await
            .context("Failed to prepare SELECT statement")?;

        let row = client.query_opt(&stmt, &[&key])
            .await
            .context(format!("Failed to query key: {}", key))?;

        match row {
            Some(r) => {
                let data: JsonValue = r.get(0);
                let value = data.to_string();

                self.cache_set(key.to_string(), value.clone());
                debug!("Cache miss, fetched from DB: {}", key);

                Ok(Some(value))
            }
            None => {
                debug!("Key not found: {}", key);
                Ok(None)
            }
        }
    }

    pub async fn get_many(&self, keys: &[String]) -> Result<HashMap<String, String>> {
        if keys.is_empty() {
            return Ok(HashMap::new());
        }

        let mut result = HashMap::new();
        let mut missing_keys = Vec::new();
        
        for key in keys {
            if let Some(mut cached) = self.cache.get_mut(key) {
                if cached.is_valid() {
                    cached.last_accessed = Instant::now();
                    result.insert(key.clone(), cached.data.clone());
                    continue;
                } else {
                    drop(cached);
                    self.cache.remove(key);
                }
            }
            missing_keys.push(key.clone());
        }

        if !missing_keys.is_empty() {
            let client = self.pool.get().await.context("Failed to get database connection")?;
            let stmt = client.prepare_cached(
                "SELECT key, data FROM baileys_auth WHERE key = ANY($1)"
            ).await.context("Failed to prepare batch SELECT statement")?;

            let rows = client.query(&stmt, &[&missing_keys])
                .await
                .context("Failed to execute batch SELECT")?;

            for row in rows {
                let key: String = row.get(0);
                let data: JsonValue = row.get(1);
                let value = data.to_string();

                result.insert(key.clone(), value.clone());
                self.cache_set(key, value);
            }
        }

        debug!(
            "Batch get: {}/{} from cache, {}/{} from DB",
            keys.len() - missing_keys.len(),
            keys.len(),
            missing_keys.len(),
            keys.len()
        );
        Ok(result)
    }

    pub async fn set(&self, key: &str, value: &str) -> Result<()> {
        let json_value: JsonValue = serde_json::from_str(value)
            .context(format!("Failed to parse JSON value for key: {}", key))?;

        let client = self.pool.get().await.context("Failed to get database connection")?;
        let stmt = client.prepare_cached(
            "INSERT INTO baileys_auth (key, data, updated_at) 
             VALUES ($1, $2, NOW()) 
             ON CONFLICT (key) 
             DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()"
        ).await.context("Failed to prepare UPSERT statement")?;

        client.execute(&stmt, &[&key, &json_value])
            .await
            .context(format!("Failed to set key: {}", key))?;

        self.cache_set(key.to_string(), value.to_string());
        debug!("Set key: {}", key);

        Ok(())
    }

    pub async fn set_many(&self, data: &HashMap<String, String>) -> Result<()> {
        if data.is_empty() {
            return Ok(());
        }

        let mut client = self.pool.get().await.context("Failed to get database connection")?;
        let transaction = client.transaction().await.context("Failed to start transaction")?;

        let stmt = transaction.prepare_cached(
            "INSERT INTO baileys_auth (key, data, updated_at) 
             VALUES ($1, $2, NOW()) 
             ON CONFLICT (key) 
             DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()"
        ).await.context("Failed to prepare batch UPSERT statement")?;

        for (key, value) in data {
            let json_value: JsonValue = serde_json::from_str(value)
                .context(format!("Failed to parse JSON value for key: {}", key))?;
            
            transaction.execute(&stmt, &[key, &json_value])
                .await
                .context(format!("Failed to set key in batch: {}", key))?;

            self.cache_set(key.clone(), value.clone());
        }

        transaction.commit().await.context("Failed to commit batch set transaction")?;
        debug!("Batch set: {} keys", data.len());
        Ok(())
    }

    #[allow(dead_code)]
    pub async fn delete(&self, key: &str) -> Result<()> {
        let client = self.pool.get().await.context("Failed to get database connection")?;
        let stmt = client.prepare_cached("DELETE FROM baileys_auth WHERE key = $1")
            .await
            .context("Failed to prepare DELETE statement")?;

        let rows_affected = client.execute(&stmt, &[&key])
            .await
            .context(format!("Failed to delete key: {}", key))?;

        self.cache.remove(key);
        debug!("Deleted key: {}, rows affected: {}", key, rows_affected);

        Ok(())
    }

    pub async fn delete_many(&self, keys: &[String]) -> Result<()> {
        if keys.is_empty() {
            return Ok(());
        }

        let client = self.pool.get().await.context("Failed to get database connection")?;
        let stmt = client.prepare_cached("DELETE FROM baileys_auth WHERE key = ANY($1)")
            .await
            .context("Failed to prepare batch DELETE statement")?;

        let rows_affected = client.execute(&stmt, &[&keys])
            .await
            .context("Failed to execute batch DELETE")?;

        for key in keys {
            self.cache.remove(key);
        }

        debug!("Batch delete: {} keys, rows affected: {}", keys.len(), rows_affected);
        Ok(())
    }

    pub async fn clear_all(&self) -> Result<()> {
        warn!("Clearing all auth keys");

        let client = self.pool.get().await.context("Failed to get database connection")?;
        client.execute("TRUNCATE TABLE baileys_auth", &[])
            .await
            .context("Failed to truncate baileys_auth table")?;

        self.cache.clear();
        info!("All auth keys cleared");
        Ok(())
    }

    pub fn stats(&self) -> AuthStats {
        let pool_status = self.pool.status();

        AuthStats {
            pool_size: self.config.pg_pool_size,
            pool_idle: pool_status.available as u32,
            pool_active: (pool_status.size - pool_status.available) as u32,
            cache_size: self.cache.len() as u64,
            cache_capacity: self.config.cache_max_size as u64,
        }
    }

    fn cache_set(&self, key: String, value: String) {
        let now = Instant::now();
        let expires_at = now + Duration::from_secs(self.config.cache_ttl_secs);

        self.cache.insert(
            key,
            CachedValue {
                data: value,
                expires_at,
                last_accessed: now,
            },
        );

        let cache_len = self.cache.len();
        if cache_len > self.config.cache_max_size {
            self.evict_expired();
            
            if self.cache.len() > self.config.cache_max_size {
                self.evict_lru();
            }
        }
    }

    fn evict_expired(&self) {
        let now = Instant::now();
        let before_count = self.cache.len();

        self.cache.retain(|_key, value| value.expires_at > now);

        let evicted = before_count - self.cache.len();
        if evicted > 0 {
            debug!("Cache eviction: removed {} expired entries, {} remaining", evicted, self.cache.len());
        }
    }

    fn evict_lru(&self) {
        let target_size = (self.config.cache_max_size * 90) / 100;
        let to_remove = self.cache.len().saturating_sub(target_size);

        if to_remove == 0 {
            return;
        }

        let mut entries: Vec<_> = self.cache.iter()
            .map(|entry| (entry.key().clone(), entry.value().last_accessed))
            .collect();
        
        entries.sort_by_key(|(_, last_accessed)| *last_accessed);

        for (key, _) in entries.iter().take(to_remove) {
            self.cache.remove(key);
        }

        warn!("Cache LRU eviction: removed {} entries, {} remaining", to_remove, self.cache.len());
    }

    fn start_cache_cleanup_task(&self) {
        let cache = Arc::clone(&self.cache);
        let cleanup_interval = Duration::from_secs(self.config.cache_ttl_secs / 2);

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(cleanup_interval);
            loop {
                interval.tick().await;
                
                let now = Instant::now();
                let before_count = cache.len();
                
                cache.retain(|_key, value| value.expires_at > now);
                
                let evicted = before_count - cache.len();
                if evicted > 0 {
                    debug!("Background cache cleanup: removed {} expired entries", evicted);
                }
            }
        });

        debug!("Started background cache cleanup task (interval: {:?})", cleanup_interval);
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AuthStats {
    pub pool_size: u32,
    pub pool_idle: u32,
    pub pool_active: u32,
    pub cache_size: u64,
    pub cache_capacity: u64,
}