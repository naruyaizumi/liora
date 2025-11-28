import { RedisClient } from "bun";
import pino from "pino";

const logger = pino({
    level: "error",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

export const REDIS_PREFIX = {
    CHAT: "liora:chat:",
    GROUP: "liora:group:",
    MESSAGE: "liora:msg:",
    CONTACT: "liora:contact:",
    BLOCKLIST: "liora:blocklist",
};

export class RedisPool {
    constructor(url, poolSize = 3) {
        this.url = url;
        this.poolSize = poolSize;
        this.clients = [];
        this.available = [];
        this.waitQueue = [];
        this.initialized = false;
        this.destroyed = false;
        this.reconnecting = new Set();
        this.reconnectTimers = new Map();
    }

    async init() {
        if (this.initialized) return;

        const promises = Array.from({ length: this.poolSize }, async (_, index) => {
            try {
                const client = await this._createClient(index);
                this.clients.push(client);
                this.available.push(client);
                return client;
            } catch (err) {
                logger.error({ err, clientIndex: index }, "Failed to create Redis client");
                throw err;
            }
        });

        await Promise.all(promises);
        this.initialized = true;
        logger.info(`Redis pool initialized with ${this.poolSize} connections`);
    }

    async _createClient(index) {
        const client = new RedisClient(this.url, {
            enableAutoPipelining: true,
            enableOfflineQueue: false,
            connectionTimeout: parseInt(Bun.env.REDIS_CONNECT_TIMEOUT || "5000"),
            idleTimeout: parseInt(Bun.env.REDIS_IDLE_TIMEOUT || "30000"),
            maxRetries: parseInt(Bun.env.REDIS_MAX_RETRIES || "3"),
        });

        client._poolIndex = index;
        client._isHealthy = false;
        client._lastHealthCheck = 0;
        client._connectionAttempts = 0;
        client._eventHandlers = {};

        if (typeof client.on === "function") {
            client._eventHandlers.error = (err) => {
                logger.error({ err, clientIndex: index }, "Redis client error");
                this._markUnhealthy(client);
            };

            client._eventHandlers.close = () => {
                logger.warn({ clientIndex: index }, "Redis client connection closed");
                this._markUnhealthy(client);
            };

            client._eventHandlers.end = () => {
                logger.warn({ clientIndex: index }, "Redis client connection ended");
                this._markUnhealthy(client);
            };

            client._eventHandlers.ready = () => {
                logger.info({ clientIndex: index }, "Redis client ready");
                client._isHealthy = true;
                client._connectionAttempts = 0;
            };

            client.on("error", client._eventHandlers.error);
            client.on("close", client._eventHandlers.close);
            client.on("end", client._eventHandlers.end);
            client.on("ready", client._eventHandlers.ready);
        }

        try {
            if (typeof client.connect === "function") {
                await client.connect();
            }
            
            await Promise.race([
                client.ping(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Connection timeout")), 5000)
                )
            ]);
            
            client._isHealthy = true;
            logger.info({ clientIndex: index }, "Redis client connected and verified");
        } catch (err) {
            logger.error({ err, clientIndex: index }, "Failed to connect Redis client");
            this._cleanupClient(client);
            throw err;
        }

        return client;
    }

    _cleanupClient(client) {
        if (client._eventHandlers && typeof client.off === "function") {
            for (const [event, handler] of Object.entries(client._eventHandlers)) {
                try {
                    client.off(event, handler);
                } catch {
                    // Ignore
                }
            }
        }
        client._eventHandlers = null;
    }

    _markUnhealthy(client) {
        const wasHealthy = client._isHealthy;
        client._isHealthy = false;

        const availableIndex = this.available.indexOf(client);
        if (availableIndex > -1) {
            this.available.splice(availableIndex, 1);
        }

        if (wasHealthy && !this.reconnecting.has(client)) {
            this._scheduleReconnect(client);
        }
    }

    _scheduleReconnect(client) {
        if (this.destroyed || this.reconnecting.has(client)) {
            return;
        }

        this.reconnecting.add(client);
        
        const delay = Math.min(1000 * Math.pow(2, client._connectionAttempts), 30000);
        
        const timer = setTimeout(() => {
            this.reconnectTimers.delete(client);
            this._reconnectClient(client).finally(() => {
                this.reconnecting.delete(client);
            });
        }, delay);
        
        this.reconnectTimers.set(client, timer);
    }

    async _reconnectClient(client) {
        if (this.destroyed) {
            return;
        }

        const maxAttempts = 5;
        client._connectionAttempts++;

        try {
            logger.info(
                { clientIndex: client._poolIndex, attempt: client._connectionAttempts },
                "Attempting to reconnect Redis client"
            );

            this._cleanupClient(client);
            
            try {
                await Promise.race([
                    client.quit?.() || client.close?.() || Promise.resolve(),
                    new Promise((resolve) => setTimeout(resolve, 1000))
                ]);
            } catch {
                // Ignore
            }

            const newClient = await this._createClient(client._poolIndex);
            
            const clientIndex = this.clients.indexOf(client);
            if (clientIndex > -1) {
                this.clients[clientIndex] = newClient;
            }

            if (newClient._isHealthy) {
                this.available.push(newClient);
                logger.info({ clientIndex: newClient._poolIndex }, "Redis client reconnected successfully");
                this._serviceWaitQueue();
            } else {
                throw new Error("Reconnected client failed health check");
            }
            
        } catch (err) {
            logger.error(
                { 
                    err, 
                    clientIndex: client._poolIndex, 
                    attempt: client._connectionAttempts,
                    maxAttempts 
                },
                "Reconnection attempt failed"
            );

            if (client._connectionAttempts < maxAttempts) {
                this._scheduleReconnect(client);
            } else {
                logger.error(
                    { clientIndex: client._poolIndex },
                    "Max reconnection attempts reached, client permanently failed"
                );
            }
        }
    }

    _serviceWaitQueue() {
        while (this.waitQueue.length > 0 && this.available.length > 0) {
            const client = this.available.pop();
            const { resolve, timeout } = this.waitQueue.shift();
            clearTimeout(timeout);
            resolve(client);
        }
    }

    async _isClientHealthy(client) {
        if (!client || !client._isHealthy || this.reconnecting.has(client)) {
            return false;
        }

        const now = Date.now();
        if (now - client._lastHealthCheck < 1000) {
            return true;
        }

        try {
            await Promise.race([
                client.ping(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Health check timeout")), 2000)
                )
            ]);
            
            client._lastHealthCheck = now;
            client._isHealthy = true;
            return true;
        } catch (err) {
            if (err.code !== "ERR_REDIS_CONNECTION_CLOSED" && !this.destroyed) {
                logger.warn({ err, clientIndex: client._poolIndex }, "Client health check failed");
            }
            
            this._markUnhealthy(client);
            return false;
        }
    }

    async acquire() {
        if (this.destroyed) {
            throw new Error("Pool has been destroyed");
        }

        if (!this.initialized) {
            await this.init();
        }

        for (let attempts = 0; attempts < this.available.length; attempts++) {
            if (this.available.length === 0) break;
            
            const client = this.available.shift();

            if (await this._isClientHealthy(client)) {
                return client;
            }
        }

        const healthyCount = this.clients.filter(c => c._isHealthy).length;
        const reconnectingCount = this.reconnecting.size;
        
        logger.warn(
            { 
                healthyClients: healthyCount,
                reconnectingClients: reconnectingCount,
                totalClients: this.clients.length,
                waitQueueSize: this.waitQueue.length
            },
            "No healthy clients available, waiting..."
        );

        if (healthyCount === 0 && reconnectingCount === 0) {
            throw new Error("No healthy Redis clients available and none reconnecting");
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = this.waitQueue.findIndex(item => item.resolve === resolve);
                if (index > -1) {
                    this.waitQueue.splice(index, 1);
                }
                reject(new Error("Timeout waiting for healthy Redis client"));
            }, 10000);

            this.waitQueue.push({ resolve, reject, timeout });
        });
    }

    release(client) {
        if (this.destroyed) {
            return;
        }

        if (!this.clients.includes(client)) {
            logger.warn({ clientIndex: client?._poolIndex }, "Attempted to release client not from this pool");
            return;
        }

        if (!client._isHealthy || this.reconnecting.has(client)) {
            logger.debug({ clientIndex: client._poolIndex }, "Not releasing unhealthy client to pool");
            return;
        }

        if (this.waitQueue.length > 0) {
            const { resolve, timeout } = this.waitQueue.shift();
            clearTimeout(timeout);
            resolve(client);
        } else {
            if (!this.available.includes(client)) {
                this.available.push(client);
            }
        }
    }

    async execute(fn, retries = 2) {
        let lastError;

        for (let attempt = 0; attempt <= retries; attempt++) {
            let client;

            try {
                client = await this.acquire();
                const result = await fn(client);
                this.release(client);
                return result;
            } catch (err) {
                lastError = err;

                if (client) {
                    const isConnectionError = 
                        err.code === "ERR_REDIS_CONNECTION_CLOSED" ||
                        err.code === "ECONNREFUSED" ||
                        err.code === "ENOTFOUND" ||
                        err.message?.includes("Connection has failed") ||
                        err.message?.includes("Connection is closed") ||
                        err.message?.includes("ETIMEDOUT");

                    if (isConnectionError) {
                        this._markUnhealthy(client);
                    } else {
                        this.release(client);
                    }
                }

                const nonRetryableErrors = [
                    "WRONGTYPE",
                    "SYNTAX",
                    "NOPERM",
                    "NOAUTH"
                ];
                
                if (nonRetryableErrors.some(code => err.message?.includes(code))) {
                    logger.error({ err }, "Non-retryable Redis error");
                    throw err;
                }

                if (attempt < retries) {
                    const delay = 100 * Math.pow(2, attempt);
                    logger.warn(
                        { err: err.message, attempt: attempt + 1, maxRetries: retries + 1, delay },
                        "Retrying Redis operation"
                    );
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    logger.error(
                        { err: err.message, attempts: attempt + 1 },
                        "Redis operation failed after all retries"
                    );
                }
            }
        }

        throw lastError;
    }

    async destroy() {
        this.destroyed = true;
        
        for (const timer of this.reconnectTimers.values()) {
            clearTimeout(timer);
        }
        this.reconnectTimers.clear();
        this.reconnecting.clear();

        for (const { reject, timeout } of this.waitQueue) {
            clearTimeout(timeout);
            reject(new Error("Pool is being destroyed"));
        }
        this.waitQueue = [];

        await Promise.allSettled(
            this.clients.map(async (client) => {
                try {
                    this._cleanupClient(client);
                    
                    if (client._isHealthy) {
                        await Promise.race([
                            client.quit?.() || client.close?.() || Promise.resolve(),
                            new Promise((resolve) => setTimeout(resolve, 2000))
                        ]);
                    }
                } catch (err) {
                    logger.warn({ err, clientIndex: client._poolIndex }, "Error closing Redis client");
                }
            })
        );

        this.clients = [];
        this.available = [];
        this.initialized = false;
        
        logger.info("Redis pool destroyed");
    }

    getStats() {
        return {
            total: this.clients.length,
            available: this.available.length,
            healthy: this.clients.filter(c => c._isHealthy).length,
            reconnecting: this.reconnecting.size,
            inUse: this.clients.length - this.available.length,
            waiting: this.waitQueue.length,
        };
    }
}

export class BatchManager {
    constructor(pool, flushInterval = 50, maxBatchSize = 1000) {
        this.pool = pool;
        this.flushInterval = flushInterval;
        this.maxBatchSize = maxBatchSize;
        this.batches = new Map();
        this.failedBatches = [];
        this.timer = null;
        this.flushing = false;
        this.destroyed = false;
        this.flushPromise = null;
    }

    add(operation, key, value, ttl) {
        if (this.destroyed) {
            logger.warn("Attempted to add to destroyed batch manager");
            return;
        }

        if (!this.batches.has(operation)) {
            this.batches.set(operation, []);
        }

        this.batches.get(operation).push({ key, value, ttl });

        const totalItems = Array.from(this.batches.values())
            .reduce((sum, items) => sum + items.length, 0);

        if (totalItems >= this.maxBatchSize) {
            this._scheduleFlush(0);
            return;
        }

        if (!this.timer && !this.flushing) {
            this._scheduleFlush(this.flushInterval);
        }
    }

    _scheduleFlush(delay) {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        
        this.timer = setTimeout(() => {
            this.timer = null;
            this.flush().catch(err => {
                logger.error({ err }, "Background flush failed");
            });
        }, delay);
    }

    async flush() {
        if (this.flushing) {
            if (this.flushPromise) {
                return await this.flushPromise;
            }
            return;
        }

        if (this.destroyed) {
            return;
        }

        this.flushing = true;
        this.flushPromise = this._doFlush();
        
        try {
            await this.flushPromise;
        } finally {
            this.flushPromise = null;
            this.flushing = false;
        }
    }

    async _doFlush() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.failedBatches.length > 0) {
            logger.info({ count: this.failedBatches.length }, "Retrying failed batches");
            const retriedBatches = [...this.failedBatches];
            this.failedBatches = [];

            for (const batch of retriedBatches) {
                for (const [operation, items] of batch) {
                    if (!this.batches.has(operation)) {
                        this.batches.set(operation, []);
                    }
                    this.batches.get(operation).push(...items);
                }
            }
        }

        if (this.batches.size === 0) {
            return;
        }

        const currentBatches = new Map(this.batches);
        this.batches.clear();

        try {
            await this.pool.execute(async (client) => {
                const operations = [];

                for (const [operation, items] of currentBatches) {
                    if (operation === "SET") {
                        for (const { key, value, ttl } of items) {
                            if (ttl) {
                                operations.push(client.setex(key, ttl, value));
                            } else {
                                operations.push(client.set(key, value));
                            }
                        }
                    } else if (operation === "DEL") {
                        const keys = items.map((item) => item.key);
                        if (keys.length > 0) {
                            for (let i = 0; i < keys.length; i += 100) {
                                const chunk = keys.slice(i, i + 100);
                                operations.push(client.del(...chunk));
                            }
                        }
                    } else if (operation === "SADD") {
                        const keyGroups = new Map();
                        for (const { key, value } of items) {
                            if (!keyGroups.has(key)) {
                                keyGroups.set(key, []);
                            }
                            keyGroups.get(key).push(value);
                        }

                        for (const [key, values] of keyGroups) {
                            operations.push(client.sadd(key, ...values));
                        }
                    } else if (operation === "SREM") {
                        const keyGroups = new Map();
                        for (const { key, value } of items) {
                            if (!keyGroups.has(key)) {
                                keyGroups.set(key, []);
                            }
                            keyGroups.get(key).push(value);
                        }

                        for (const [key, values] of keyGroups) {
                            operations.push(client.srem(key, ...values));
                        }
                    }
                }

                if (operations.length > 0) {
                    await Promise.all(operations);
                    logger.debug({ count: operations.length }, "Flushed Redis operations");
                }
            }, 1);
        } catch (err) {
            logger.warn({ err, batchCount: currentBatches.size }, "Batch flush error, will retry");

            if (this.failedBatches.length < 10) {
                this.failedBatches.push(currentBatches);
            } else {
                logger.error("Too many failed batches, dropping oldest");
                this.failedBatches.shift();
                this.failedBatches.push(currentBatches);
            }
        }
    }

    async destroy() {
        this.destroyed = true;

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        try {
            await this.flush();
        } catch (err) {
            logger.error({ err }, "Error during final batch flush");
        }
    }
}

export class RedisLRUCache {
    constructor(pool, batchManager, prefix, maxSize = 500, ttl = 3600) {
        this.pool = pool;
        this.batchManager = batchManager;
        this.prefix = prefix;
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.cache = new Map();
        this.pending = new Map();
        this.stats = { hits: 0, misses: 0, evictions: 0, redisHits: 0, errors: 0 };
    }

    _getKey(key) {
        return `${this.prefix}${key}`;
    }

    async get(key) {
        if (!key) {
            logger.warn("Cache get called with null/undefined key");
            return undefined;
        }

        if (this.cache.has(key)) {
            const item = this.cache.get(key);
            if (Date.now() - item.timestamp <= this.ttl * 1000) {
                this.cache.delete(key);
                this.cache.set(key, item);
                this.stats.hits++;
                return item.value;
            }
            this.cache.delete(key);
        }

        if (this.pending.has(key)) {
            return await this.pending.get(key);
        }

        const promise = this._fetchFromRedis(key);
        this.pending.set(key, promise);

        try {
            return await promise;
        } finally {
            this.pending.delete(key);
        }
    }

    async _fetchFromRedis(key) {
        try {
            const redisKey = this._getKey(key);
            const value = await this.pool.execute((client) => client.get(redisKey));

            if (value !== null && value !== undefined) {
                try {
                    const parsed = JSON.parse(value);
                    this._setLocal(key, parsed);
                    this.stats.redisHits++;
                    return parsed;
                } catch (parseErr) {
                    logger.warn({ err: parseErr, key }, "JSON parse error, invalid data in cache");
                    this.stats.errors++;
                    this.batchManager.add("DEL", redisKey);
                }
            }
        } catch (err) {
            logger.warn({ err: err.message, key }, "Redis get error");
            this.stats.errors++;
        }

        this.stats.misses++;
        return undefined;
    }

    async set(key, value) {
        if (!key) {
            logger.warn("Attempted to set cache with null/undefined key");
            return false;
        }

        if (value === undefined) {
            logger.warn({ key }, "Attempted to set cache with undefined value");
            return false;
        }

        this._setLocal(key, value);

        try {
            const redisKey = this._getKey(key);
            const serialized = JSON.stringify(value);
            this.batchManager.add("SET", redisKey, serialized, this.ttl);
            return true;
        } catch (err) {
            logger.warn({ err, key }, "Failed to serialize value for cache");
            this.stats.errors++;
            this.cache.delete(key);
            return false;
        }
    }

    _setLocal(key, value) {
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            this.stats.evictions++;
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
        });
    }

    async delete(key) {
        if (!key) {
            return false;
        }

        this.cache.delete(key);
        this.pending.delete(key);

        const redisKey = this._getKey(key);
        this.batchManager.add("DEL", redisKey);
        return true;
    }

    async has(key) {
        if (!key) {
            return false;
        }

        if (this.cache.has(key)) {
            const item = this.cache.get(key);
            if (Date.now() - item.timestamp <= this.ttl * 1000) {
                return true;
            }
            this.cache.delete(key);
        }

        try {
            const redisKey = this._getKey(key);
            const exists = await this.pool.execute((client) => client.exists(redisKey));
            return exists === 1;
        } catch (err) {
            logger.warn({ err: err.message, key }, "Redis exists error");
            this.stats.errors++;
            return false;
        }
    }

    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.pending.clear();
        logger.debug({ cleared: size }, "Cache cleared");
        return size;
    }

    cleanup() {
        const now = Date.now();
        let deleted = 0;

        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.ttl * 1000) {
                this.cache.delete(key);
                deleted++;
            }
        }

        if (deleted > 0) {
            logger.debug({ deleted }, "Cleaned up expired cache entries");
        }

        return deleted;
    }

    getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            ...this.stats,
            localSize: this.cache.size,
            pendingSize: this.pending.size,
            hitRate: total > 0 ? (this.stats.hits / total) : 0,
        };
    }

    get size() {
        return this.cache.size;
    }
}

export class RedisBlocklistCache {
    constructor(pool, batchManager) {
        this.pool = pool;
        this.batchManager = batchManager;
        this.localSet = new Set();
        this.lastSync = 0;
        this.syncInterval = 30000;
        this.syncing = false;
        this.syncPromise = null;
    }

    async _syncFromRedis() {
        const now = Date.now();
        
        if (now - this.lastSync < this.syncInterval) {
            return;
        }

        if (this.syncing) {
            if (this.syncPromise) {
                return await this.syncPromise;
            }
            return;
        }

        this.syncing = true;
        this.syncPromise = this._doSync();

        try {
            await this.syncPromise;
        } finally {
            this.syncPromise = null;
            this.syncing = false;
        }
    }

    async _doSync() {
        try {
            const members = await this.pool.execute((client) =>
                client.smembers(REDIS_PREFIX.BLOCKLIST)
            );

            this.localSet.clear();
            for (const member of members || []) {
                this.localSet.add(member);
            }
            this.lastSync = Date.now();
            logger.debug({ count: this.localSet.size }, "Synced blocklist entries from Redis");
        } catch (err) {
            logger.warn({ err: err.message }, "Blocklist sync error");
        }
    }

    async add(jid) {
        if (!jid) {
            logger.warn("Attempted to add null/undefined JID to blocklist");
            return;
        }
        this.localSet.add(jid);
        this.batchManager.add("SADD", REDIS_PREFIX.BLOCKLIST, jid);
        logger.debug({ jid }, "Added to blocklist");
    }

    async delete(jid) {
        if (!jid) {
            return;
        }
        this.localSet.delete(jid);
        this.batchManager.add("SREM", REDIS_PREFIX.BLOCKLIST, jid);
        logger.debug({ jid }, "Removed from blocklist");
    }

    async has(jid) {
        if (!jid) {
            return false;
        }
        
        await this._syncFromRedis();
        return this.localSet.has(jid);
    }

    async clear() {
        this.localSet.clear();
        this.lastSync = 0;
        
        try {
            await this.pool.execute((client) => client.del(REDIS_PREFIX.BLOCKLIST));
            logger.info("Blocklist cleared");
        } catch (err) {
            logger.warn({ err: err.message }, "Blocklist clear error");
        }
    }

    get size() {
        return this.localSet.size;
    }
}