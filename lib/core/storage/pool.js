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
        client._isConnecting = false;
        client._connectionAttempts = 0;

        if (typeof client.on === "function") {
            client.on("error", (err) => {
                logger.error({ err, clientIndex: index }, "Redis client error");
                this._markUnhealthy(client);
            });

            client.on("close", () => {
                logger.warn({ clientIndex: index }, "Redis client connection closed");
                this._markUnhealthy(client);
            });

            client.on("end", () => {
                logger.warn({ clientIndex: index }, "Redis client connection ended");
                this._markUnhealthy(client);
            });

            client.on("ready", () => {
                logger.info({ clientIndex: index }, "Redis client ready");
                client._isHealthy = true;
                client._connectionAttempts = 0;
            });
        }

        try {
            await client.connect();
            client._isHealthy = true;
            logger.info({ clientIndex: index }, "Redis client connected");
        } catch (err) {
            logger.error({ err, clientIndex: index }, "Failed to connect Redis client");
            throw err;
        }

        return client;
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
        
        setTimeout(() => {
            this._reconnectClient(client).finally(() => {
                this.reconnecting.delete(client);
            });
        }, delay);
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

            try {
                await Promise.race([
                    client.quit?.(),
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

            this.available.push(newClient);
            
            logger.info({ clientIndex: newClient._poolIndex }, "Redis client reconnected successfully");
            
            this._serviceWaitQueue();
            
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
        if (!client._isHealthy || this.reconnecting.has(client)) {
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
            return true;
        } catch (err) {
            if (err.code !== "ERR_REDIS_CONNECTION_CLOSED") {
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

        let attempts = 0;
        const maxAttempts = this.available.length;

        while (attempts < maxAttempts && this.available.length > 0) {
            const client = this.available.pop();
            attempts++;

            if (await this._isClientHealthy(client)) {
                return client;
            }
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
            
            logger.warn(
                { 
                    waitQueueSize: this.waitQueue.length,
                    availableClients: this.available.length,
                    totalClients: this.clients.length,
                    healthyClients: this.clients.filter(c => c._isHealthy).length
                },
                "Waiting for available Redis client"
            );
        });
    }

    release(client) {
        if (this.destroyed) {
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
                    if (
                        err.code === "ERR_REDIS_CONNECTION_CLOSED" ||
                        err.message?.includes("Connection has failed") ||
                        err.message?.includes("Connection is closed")
                    ) {
                        this._markUnhealthy(client);
                    } else {
                        this.release(client);
                    }
                }

                const nonRetryableErrors = [
                    "WRONGTYPE",
                    "SYNTAX",
                    "NOPERM"
                ];
                
                if (nonRetryableErrors.some(code => err.message?.includes(code))) {
                    logger.error({ err }, "Non-retryable Redis error");
                    break;
                }

                if (attempt < retries) {
                    const delay = 100 * Math.pow(2, attempt);
                    logger.warn(
                        { err, attempt: attempt + 1, delay },
                        "Retrying Redis operation"
                    );
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    logger.error(
                        { err, attempts: attempt + 1 },
                        "Redis operation failed after all retries"
                    );
                }
            }
        }

        throw lastError;
    }

    async destroy() {
        this.destroyed = true;
        this.reconnecting.clear();

        for (const { reject, timeout } of this.waitQueue) {
            clearTimeout(timeout);
            reject(new Error("Pool is being destroyed"));
        }
        this.waitQueue = [];

        await Promise.allSettled(
            this.clients.map(async (client) => {
                try {
                    if (client._isHealthy) {
                        await Promise.race([
                            client.quit?.() || client.close?.(),
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
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            this.flush().catch(err => {
                logger.error({ err }, "Background flush failed");
            });
            return;
        }

        if (!this.timer && !this.flushing) {
            this.timer = setTimeout(() => this.flush(), this.flushInterval);
        }
    }

    async flush() {
        if (this.flushing) {
            if (this.flushPromise) {
                return this.flushPromise;
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
            logger.info(`Retrying ${this.failedBatches.length} failed batches`);
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
                    logger.debug(`Flushed ${operations.length} Redis operations`);
                }
            }, 1);
        } catch (err) {
            logger.warn({ err, batchCount: currentBatches.size }, "Batch flush error");

            if (this.failedBatches.length < 10) {
                this.failedBatches.push(currentBatches);
                logger.info("Failed batch saved for retry");
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
        if (!key) return undefined;

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
            const value = await promise;
            return value;
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
                    logger.warn({ err: parseErr, key }, "JSON parse error");
                    this.stats.errors++;
                }
            }
        } catch (err) {
            logger.warn({ err, key }, "Redis get error");
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

        this._setLocal(key, value);

        try {
            const redisKey = this._getKey(key);
            const serialized = JSON.stringify(value);
            this.batchManager.add("SET", redisKey, serialized, this.ttl);
            return true;
        } catch (err) {
            logger.warn({ err, key }, "Failed to serialize value for cache");
            this.stats.errors++;
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
        this.cache.delete(key);
        this.pending.delete(key);

        const redisKey = this._getKey(key);
        this.batchManager.add("DEL", redisKey);
        return true;
    }

    async has(key) {
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
            logger.warn({ err, key }, "Redis exists error");
            this.stats.errors++;
            return false;
        }
    }

    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.pending.clear();
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

        return deleted;
    }

    getStats() {
        return {
            ...this.stats,
            localSize: this.cache.size,
            pendingSize: this.pending.size,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
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
            logger.debug(`Synced ${this.localSet.size} blocklist entries from Redis`);
        } catch (err) {
            logger.warn({ err }, "Blocklist sync error");
        }
    }

    async add(jid) {
        this.localSet.add(jid);
        this.batchManager.add("SADD", REDIS_PREFIX.BLOCKLIST, jid);
    }

    async delete(jid) {
        this.localSet.delete(jid);
        this.batchManager.add("SREM", REDIS_PREFIX.BLOCKLIST, jid);
    }

    async has(jid) {
        await this._syncFromRedis();
        return this.localSet.has(jid);
    }

    async clear() {
        this.localSet.clear();
        try {
            await this.pool.execute((client) => client.del(REDIS_PREFIX.BLOCKLIST));
        } catch (err) {
            logger.warn({ err }, "Blocklist clear error");
        }
    }

    get size() {
        return this.localSet.size;
    }
}