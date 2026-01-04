import { SQL } from "bun";
import { BufferJSON } from "baileys";

const stringify = (obj) => JSON.stringify(obj, BufferJSON.replacer);

export const parse = (str) => {
    if (!str) return null;
    try {
        return JSON.parse(str, BufferJSON.reviver);
    } catch (e) {
        global.logger?.error(e.message);
        return null;
    }
};

export const makeKey = (type, id) => `${type}-${id}`;

class WriteBuffer {
    constructor(maxSize = 100) {
        this.upserts = new Map();
        this.deletes = new Set();
        this.maxSize = maxSize;
    }
    
    addUpsert(k, v) {
        if (this.upserts.size >= this.maxSize) {
            throw new Error("Buffer full - flush required");
        }
        this.upserts.set(k, v);
        this.deletes.delete(k);
    }
    
    addDelete(k) {
        this.deletes.add(k);
        this.upserts.delete(k);
    }
    
    clear() {
        this.upserts.clear();
        this.deletes.clear();
    }
    
    hasChanges() {
        return this.upserts.size > 0 || this.deletes.size > 0;
    }
    
    toArrays() {
        return {
            upserts: Array.from(this.upserts.entries()),
            deletes: Array.from(this.deletes.values()),
        };
    }
}

export class DatabaseCore {
    constructor(options = {}) {
        this.instanceId = `DatabaseCore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const connectionString = Bun.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/liora_auth";
        
        this.db = new SQL(connectionString);
        
        this.initialized = false;
        this.initPromise = this._initDatabase().catch(err => {
            global.logger?.error({ error: err.message }, "Database initialization failed");
            throw err;
        });
        
        this.writeBuffer = new WriteBuffer(options.maxBuffer || 100);
        this.flushIntervalMs = Number(options.flushIntervalMs ?? 200);
        this.maxBatch = Number(options.maxBatch ?? 500);
        this.flushTimer = null;
        this.disposed = false;
        this.isCleaningUp = false;
        this.pendingFlush = null;
        
        this.autoCleanupEnabled = options.autoCleanup !== false;
        this.cleanupIntervalMs = Number(options.cleanupIntervalMs ?? 30 * 60 * 1000);
        this.maxDbSize = Number(options.maxDbSize ?? 100 * 1024 * 1024);
        this.cleanupTimer = null;
        this.lastCleanup = Date.now();
        
        if (this.autoCleanupEnabled) {
            this._scheduleCleanup();
        }
    }
    
    async _initDatabase() {
        try {
            try {
                await this.db`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
            } catch {
                //
            }
            
            await this.db`
                CREATE TABLE IF NOT EXISTS baileys_state (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            `;
            
            await this.db`
                CREATE INDEX IF NOT EXISTS idx_baileys_key_prefix 
                ON baileys_state(key text_pattern_ops) 
                WHERE key LIKE '%-%'
            `;
            
            try {
                await this.db`
                    CREATE OR REPLACE FUNCTION update_baileys_timestamp()
                    RETURNS TRIGGER AS $$
                    BEGIN
                        NEW.updated_at = NOW();
                        RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql
                `;
            } catch {
                //
            }
            
            try {
                await this.db`DROP TRIGGER IF EXISTS baileys_updated_at ON baileys_state`;
                await this.db`
                    CREATE TRIGGER baileys_updated_at
                    BEFORE UPDATE ON baileys_state
                    FOR EACH ROW
                    EXECUTE FUNCTION update_baileys_timestamp()
                `;
            } catch {
                //
            }
            
            try {
                await this.db`
                    CREATE OR REPLACE FUNCTION cleanup_old_sessions()
                    RETURNS INTEGER AS $$
                    DECLARE
                        deleted_count INTEGER;
                    BEGIN
                        DELETE FROM baileys_state 
                        WHERE key LIKE 'pre-key-%' 
                           OR key LIKE 'sender-key-%' 
                           OR key LIKE 'session-%'
                           OR key LIKE 'app-state-sync-version-%';
                        
                        GET DIAGNOSTICS deleted_count = ROW_COUNT;
                        RETURN deleted_count;
                    END;
                    $$ LANGUAGE plpgsql
                `;
            } catch {
                //
            }
            
            this.initialized = true;
            
        } catch (e) {
            global.logger?.fatal({ error: e.message, stack: e.stack }, "Database initialization failed");
            throw e;
        }
    }
    
    async _ensureInitialized() {
        if (!this.initialized && this.initPromise) {
            await this.initPromise;
        }
        return this.initialized;
    }
    
    async get(key) {
        if (this.disposed) return undefined;
        
        await this._ensureInitialized();
        
        try {
            const result = await this.db`SELECT value FROM baileys_state WHERE key = ${key}`;
            return result.length > 0 ? result[0] : undefined;
        } catch (e) {
            global.logger?.error(`Get error: ${e.message}`);
            return undefined;
        }
    }
    
    set(key, value) {
        if (this.disposed || this.isCleaningUp) return;
        
        try {
            this.writeBuffer.addUpsert(key, value);
            this._scheduleFlush();
        } catch (e) {
            if (e.message === "Buffer full - flush required") {
                this.flush().then(() => {
                    this.writeBuffer.addUpsert(key, value);
                }).catch(err => {
                    global.logger?.error(`Flush on buffer full failed: ${err.message}`);
                });
            }
        }
    }
    
    del(key) {
        if (this.disposed || this.isCleaningUp) return;
        this.writeBuffer.addDelete(key);
        this._scheduleFlush();
    }
    
    _scheduleFlush() {
        if (!this.flushTimer && !this.disposed && !this.isCleaningUp) {
            this.flushTimer = setTimeout(() => {
                this.flushTimer = null;
                this.flush().catch((err) => {
                    if (!this.disposed) {
                        global.logger?.error(`Flush error: ${err.message}`);
                    }
                });
            }, this.flushIntervalMs);
        }
    }
    
    async flush() {
        if (this.disposed || this.isCleaningUp) return;
        
        if (this.pendingFlush) {
            return this.pendingFlush;
        }
        
        this.pendingFlush = (async () => {
            try {
                await this._ensureInitialized();
                
                if (!this.writeBuffer.hasChanges() || this.disposed) return;
                
                const { upserts, deletes } = this.writeBuffer.toArrays();
                this.writeBuffer.clear();
                
                if (this.disposed) return;
                
                await this.db.begin(async (tx) => {
                    for (const [k, v] of upserts) {
                        await tx`
                            INSERT INTO baileys_state (key, value) 
                            VALUES (${k}, ${stringify(v)}) 
                            ON CONFLICT (key) 
                            DO UPDATE SET value = EXCLUDED.value
                        `;
                    }
                    
                    for (const k of deletes) {
                        await tx`DELETE FROM baileys_state WHERE key = ${k}`;
                    }
                });
            } catch (e) {
                if (!this.disposed) {
                    global.logger?.error(`Transaction error: ${e.message}`);
                }
                throw e;
            } finally {
                this.pendingFlush = null;
            }
        })();
        
        return this.pendingFlush;
    }
    
    async setMany(data) {
        if (this.disposed || this.isCleaningUp) return;
        
        await this._ensureInitialized();
        
        try {
            await this.db.begin(async (tx) => {
                for (const [key, value] of Object.entries(data)) {
                    await tx`
                        INSERT INTO baileys_state (key, value) 
                        VALUES (${key}, ${stringify(value)}) 
                        ON CONFLICT (key) 
                        DO UPDATE SET value = EXCLUDED.value
                    `;
                }
            });
        } catch (error) {
            global.logger?.error(`Batch set error: ${error.message}`);
            throw error;
        }
    }
    
    async deleteMany(keys) {
        if (this.disposed || this.isCleaningUp) return;
        
        await this._ensureInitialized();
        
        try {
            await this.db.begin(async (tx) => {
                for (const key of keys) {
                    await tx`DELETE FROM baileys_state WHERE key = ${key}`;
                }
            });
        } catch (error) {
            global.logger?.error(`Batch delete error: ${error.message}`);
            throw error;
        }
    }
    
    _scheduleCleanup() {
        if (this.cleanupTimer || this.disposed) return;
        
        this.cleanupTimer = setTimeout(() => {
            this.cleanupTimer = null;
            this._performCleanup().catch((e) => {
                if (!this.disposed) {
                    global.logger?.error(`Auto-cleanup error: ${e.message}`);
                }
            });
        }, this.cleanupIntervalMs);
    }
    
    async _performCleanup() {
        if (this.disposed || this.isCleaningUp) return;
        
        await this._ensureInitialized();
        
        try {
            const sizeResult = await this.db`SELECT pg_database_size(current_database()) as size`;
            const dbSize = parseInt(sizeResult[0]?.size, 10);
            
            global.logger?.info(`Database size: ${(dbSize / 1024 / 1024).toFixed(2)} MB`);
            
            if (dbSize > this.maxDbSize) {
                await this.flush();
                
                await this.db.begin(async (tx) => {
                    const result = await tx`SELECT cleanup_old_sessions()`;
                    const deletedCount = result[0]?.cleanup_old_sessions;
                    
                    global.logger?.info(`Cleaned up ${deletedCount} old session entries`);
                    
                    await tx`VACUUM ANALYZE baileys_state`;
                    
                });
            }
            
            this.lastCleanup = Date.now();
            
            if (this.autoCleanupEnabled) {
                this._scheduleCleanup();
            }
        } catch (e) {
            global.logger?.error(`Cleanup error: ${e.message}`);
            
            if (this.autoCleanupEnabled) {
                this._scheduleCleanup();
            }
        }
    }
    
    async manualCleanup() {
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        await this._performCleanup();
    }
    
    async getDbStats() {
        await this._ensureInitialized();
        
        try {
            const result = await this.db`
                SELECT 
                    COUNT(*) as entries,
                    pg_size_pretty(pg_total_relation_size('baileys_state')) as table_size,
                    pg_size_pretty(pg_database_size(current_database())) as db_size
                FROM baileys_state
            `;
            
            return {
                entries: parseInt(result[0]?.entries, 10),
                tableSize: result[0]?.table_size,
                dbSize: result[0]?.db_size,
            };
        } catch (e) {
            global.logger?.error(`Stats error: ${e.message}`);
            return null;
        }
    }
    
    async dispose() {
        if (this.disposed || this.isCleaningUp) return;
        
        this.isCleaningUp = true;
        
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        
        try {
            if (this.pendingFlush) {
                await Promise.race([
                    this.pendingFlush,
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Pending flush timeout")), 3000))
                ]).catch(() => {
                    global.logger?.warn("Pending flush timeout during dispose");
                });
            }
            
            if (this.initialized) {
                const { upserts, deletes } = this.writeBuffer.toArrays();
                if (upserts.length || deletes.length) {
                    await this.db.begin(async (tx) => {
                        for (const [k, v] of upserts) {
                            await tx`
                                INSERT INTO baileys_state (key, value) 
                                VALUES (${k}, ${stringify(v)}) 
                                ON CONFLICT (key) 
                                DO UPDATE SET value = EXCLUDED.value
                            `;
                        }
                        for (const k of deletes) {
                            await tx`DELETE FROM baileys_state WHERE key = ${k}`;
                        }
                    });
                }
            }
            this.writeBuffer.clear();
            
            if (this.initialized && !this.disposed) {
                try {
                    const stats = await this.getDbStats();
                    if (stats) {
                        global.logger?.info(`Final DB stats: ${stats.entries} entries, ${stats.dbSize}`);
                    }
                    
                    await this.db`VACUUM ANALYZE baileys_state`;
                } catch (e) {
                    global.logger?.error(`DB cleanup error: ${e.message}`);
                }
            }
        } catch (e) {
            global.logger?.error(`Dispose error: ${e.message}`);
        } finally {
            try {
                await this.db.close();
            } catch {
                //
            }
            
            this.disposed = true;
            this.db = null;
            this.writeBuffer = null;
            this.pendingFlush = null;
            this.initialized = false;
        }
    }
    
    isHealthy() {
        return !this.disposed && !this.isCleaningUp && this.db !== null && this.initialized;
    }
}

const core = new DatabaseCore();
export default core;