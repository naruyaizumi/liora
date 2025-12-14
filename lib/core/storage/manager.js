import { EventEmitter } from "events";
import { Mutex } from "async-mutex";
import PQueue from "p-queue";
import { LRUCache } from "lru-cache";
import { logger, isGroup, isStatus, sanitizeJid } from "./utils.js";

export class StoreManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            chatCacheSize: options.chatCacheSize || 500,
            groupMetaCacheSize: options.groupMetaCacheSize || 200,
            messageCacheSize: options.messageCacheSize || 1000,
            contactCacheSize: options.contactCacheSize || 1000,
            presenceCacheSize: options.presenceCacheSize || 100,
            cleanupInterval: options.cleanupInterval || 300000,
            metadataTimeout: options.metadataTimeout || 30000,
            enableMetrics: options.enableMetrics !== false,
            ttl: options.ttl || 1800000,
            enableGC: options.enableGC !== false,
            ...options,
        };

        this.chatCache = new LRUCache({
            max: this.options.chatCacheSize,
            ttl: this.options.ttl,
            updateAgeOnGet: true,
            updateAgeOnHas: false,
        });

        this.groupMetaCache = new LRUCache({
            max: this.options.groupMetaCacheSize,
            ttl: this.options.ttl * 2,
            updateAgeOnGet: true,
        });

        this.messageCache = new LRUCache({
            max: this.options.messageCacheSize,
            ttl: this.options.ttl,
            updateAgeOnGet: true,
        });

        this.contactCache = new LRUCache({
            max: this.options.contactCacheSize,
            ttl: this.options.ttl * 3,
            updateAgeOnGet: true,
        });

        this.presenceCache = new LRUCache({
            max: this.options.presenceCacheSize,
            ttl: 60000,
            updateAgeOnGet: true,
        });

        this.pendingMeta = new Map();
        this.pendingMessages = new Map();
        this.metadataMutex = new Map();
        this.chatMutex = new Mutex();
        
        this.metadataQueue = new PQueue({
            concurrency: 3,
            timeout: this.options.metadataTimeout,
            throwOnTimeout: true,
        });

        this.metrics = {
            hits: { chat: 0, group: 0, message: 0, contact: 0, presence: 0 },
            misses: { chat: 0, group: 0, message: 0, contact: 0, presence: 0 },
            errors: { chat: 0, group: 0, message: 0, contact: 0, metadata: 0 },
            operations: {
                chatUpsert: 0,
                chatUpdate: 0,
                chatDelete: 0,
                messageUpsert: 0,
                contactUpsert: 0,
                groupUpdate: 0,
            },
            lastCleanup: null,
            lastError: null,
        };

        this.cleanupTimer = null;
        this.metricsTimer = null;
        this.disposed = false;

        this._startCleanupTimer();
        if (this.options.enableMetrics) {
            this._startMetricsTimer();
        }

        logger.info({ options: this.options }, "StoreManager initialized");
    }
    
    getChat(id) {
        if (!id || isStatus(id)) return undefined;
        
        const value = this.chatCache.get(id);
        if (value !== undefined) {
            this.metrics.hits.chat++;
            return value;
        }
        
        this.metrics.misses.chat++;
        return undefined;
    }

    setChat(id, data) {
        if (!id || isStatus(id) || !data) return false;
        
        try {
            const sanitized = sanitizeJid(id);
            if (!sanitized) return false;
            
            const existing = this.chatCache.get(sanitized);
            const merged = existing ? { ...existing, ...data } : data;
            
            this.chatCache.set(sanitized, merged);
            this.emit("chat:update", { id: sanitized, data: merged });
            
            return true;
        } catch (err) {
            this.metrics.errors.chat++;
            logger.error({ err, id }, "Failed to set chat");
            return false;
        }
    }

    deleteChat(id) {
        if (!id || isStatus(id)) return false;
        
        try {
            const deleted = this.chatCache.delete(id);
            if (deleted) {
                this.emit("chat:delete", { id });
            }
            return deleted;
        } catch (err) {
            this.metrics.errors.chat++;
            logger.error({ err, id }, "Failed to delete chat");
            return false;
        }
    }

    getGroupMeta(id) {
        if (!id || !isGroup(id)) return undefined;
        
        const value = this.groupMetaCache.get(id);
        if (value !== undefined) {
            this.metrics.hits.group++;
            return value;
        }
        
        this.metrics.misses.group++;
        return undefined;
    }

    setGroupMeta(id, metadata) {
        if (!id || !isGroup(id) || !metadata) return false;
        
        try {
            this.groupMetaCache.set(id, metadata);
            this.emit("group:metadata", { id, metadata });
            return true;
        } catch (err) {
            this.metrics.errors.group++;
            logger.error({ err, id }, "Failed to set group metadata");
            return false;
        }
    }

    async fetchGroupMetadata(conn, id, force = false) {
        if (!id || !isGroup(id)) {
            return null;
        }

        if (!force) {
            const cached = this.getGroupMeta(id);
            if (cached) {
                logger.debug({ id }, "Group metadata cache hit");
                return cached;
            }
        }

        if (this.pendingMeta.has(id)) {
            logger.debug({ id }, "Returning pending metadata request");
            return this.pendingMeta.get(id);
        }

        if (!this.metadataMutex.has(id)) {
            this.metadataMutex.set(id, new Mutex());
        }
        const mutex = this.metadataMutex.get(id);

        const promise = this.metadataQueue.add(() =>
            mutex.runExclusive(async () => {
                try {
                    logger.debug({ id, force }, "Fetching group metadata");
                    
                    const metadata = await conn.groupMetadata(id);
                    
                    if (metadata) {
                        this.setGroupMeta(id, metadata);
                        logger.debug({ id, participants: metadata.participants?.length }, "Group metadata fetched");
                    }
                    
                    return metadata;
                } catch (err) {
                    this.metrics.errors.metadata++;
                    
                    if (err.output?.statusCode === 404) {
                        logger.warn({ id }, "Group not found");
                    } else if (err.output?.statusCode === 401) {
                        logger.warn({ id }, "Not a member of group");
                    } else {
                        logger.error({ err, id }, "Failed to fetch group metadata");
                    }
                    
                    return null;
                } finally {
                    this.pendingMeta.delete(id);
                }
            })
        );

        this.pendingMeta.set(id, promise);

        setTimeout(() => {
            if (this.pendingMeta.get(id) === promise) {
                this.pendingMeta.delete(id);
                logger.warn({ id }, "Group metadata request timeout cleanup");
            }
        }, this.options.metadataTimeout);

        return promise;
    }

    getMessage(id) {
        if (!id) return undefined;
        
        const value = this.messageCache.get(id);
        if (value !== undefined) {
            this.metrics.hits.message++;
            return value;
        }
        
        this.metrics.misses.message++;
        return undefined;
    }

    setMessage(id, message) {
        if (!id || !message) return false;
        
        try {
            this.messageCache.set(id, message);
            this.emit("message:set", { id, message });
            return true;
        } catch (err) {
            this.metrics.errors.message++;
            logger.error({ err, id }, "Failed to set message");
            return false;
        }
    }

    getContact(id) {
        if (!id || isStatus(id)) return undefined;
        
        const value = this.contactCache.get(id);
        if (value !== undefined) {
            this.metrics.hits.contact++;
            return value;
        }
        
        this.metrics.misses.contact++;
        return undefined;
    }

    setContact(id, contact) {
        if (!id || isStatus(id) || !contact) return false;
        
        try {
            const sanitized = sanitizeJid(id);
            if (!sanitized) return false;
            
            this.contactCache.set(sanitized, contact);
            this.emit("contact:update", { id: sanitized, contact });
            return true;
        } catch (err) {
            this.metrics.errors.contact++;
            logger.error({ err, id }, "Failed to set contact");
            return false;
        }
    }

    getPresence(id) {
        if (!id || isStatus(id)) return undefined;
        
        const value = this.presenceCache.get(id);
        if (value !== undefined) {
            this.metrics.hits.presence++;
            return value;
        }
        
        this.metrics.misses.presence++;
        return undefined;
    }

    setPresence(id, presence) {
        if (!id || isStatus(id) || !presence) return false;
        
        try {
            this.presenceCache.set(id, presence);
            this.emit("presence:update", { id, presence });
            return true;
        } catch (err) {
            logger.error({ err, id }, "Failed to set presence");
            return false;
        }
    }

    async batchFetchGroupMetadata(conn, ids, options = {}) {
        if (!Array.isArray(ids) || ids.length === 0) {
            return [];
        }

        const batchSize = options.batchSize || 5;
        const delay = options.delay || 1000;
        const results = [];

        logger.info({ count: ids.length, batchSize }, "Starting batch metadata fetch");

        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            
            const batchResults = await Promise.allSettled(
                batch.map(id => this.fetchGroupMetadata(conn, id, options.force))
            );

            results.push(...batchResults);

            if (i + batchSize < ids.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        const successful = results.filter(r => r.status === "fulfilled").length;
        logger.info({ 
            total: ids.length,
            successful,
            failed: ids.length - successful 
        }, "Batch metadata fetch completed");

        return results;
    }

    _startCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.cleanupTimer = setInterval(() => {
            try {
                this._performCleanup();
            } catch (err) {
                logger.error({ err }, "Cleanup error");
            }
        }, this.options.cleanupInterval);

        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }

    _performCleanup() {
        const before = {
            chats: this.chatCache.size,
            groups: this.groupMetaCache.size,
            messages: this.messageCache.size,
            contacts: this.contactCache.size,
            presence: this.presenceCache.size,
        };

        const now = Date.now();
        
        for (const [id, timestamp] of this.pendingMeta.entries()) {
            if (typeof timestamp === "number" && now - timestamp > this.options.metadataTimeout) {
                this.pendingMeta.delete(id);
            }
        }

        if (this.metadataMutex.size > 100) {
            const toDelete = this.metadataMutex.size - 50;
            const iterator = this.metadataMutex.keys();
            for (let i = 0; i < toDelete; i++) {
                const key = iterator.next().value;
                if (key) this.metadataMutex.delete(key);
            }
        }

        this.metrics.lastCleanup = new Date();

        const after = {
            chats: this.chatCache.size,
            groups: this.groupMetaCache.size,
            messages: this.messageCache.size,
            contacts: this.contactCache.size,
            presence: this.presenceCache.size,
        };

        logger.debug({ before, after }, "Cleanup completed");

        if (global.gc && this.options.enableGC) {
            try {
                global.gc();
            } catch (err) {
                // ignore
            }
        }

        this.emit("cleanup", { before, after });
    }

    _startMetricsTimer() {
        if (this.metricsTimer) {
            clearInterval(this.metricsTimer);
        }

        this.metricsTimer = setInterval(() => {
            this._logMetrics();
        }, 60000);

        if (this.metricsTimer.unref) {
            this.metricsTimer.unref();
        }
    }

    _logMetrics() {
        const hitRates = {
            chat: this.metrics.hits.chat / (this.metrics.hits.chat + this.metrics.misses.chat) || 0,
            group: this.metrics.hits.group / (this.metrics.hits.group + this.metrics.misses.group) || 0,
            message: this.metrics.hits.message / (this.metrics.hits.message + this.metrics.misses.message) || 0,
            contact: this.metrics.hits.contact / (this.metrics.hits.contact + this.metrics.misses.contact) || 0,
        };

        logger.info({
            caches: {
                chats: this.chatCache.size,
                groups: this.groupMetaCache.size,
                messages: this.messageCache.size,
                contacts: this.contactCache.size,
                presence: this.presenceCache.size,
            },
            hitRates,
            errors: this.metrics.errors,
            operations: this.metrics.operations,
            pending: {
                metadata: this.pendingMeta.size,
                messages: this.pendingMessages.size,
            },
            queue: {
                size: this.metadataQueue.size,
                pending: this.metadataQueue.pending,
            },
        }, "Store metrics");
    }

    getMetrics() {
        return {
            ...this.metrics,
            caches: {
                chats: {
                    size: this.chatCache.size,
                    max: this.options.chatCacheSize,
                },
                groups: {
                    size: this.groupMetaCache.size,
                    max: this.options.groupMetaCacheSize,
                },
                messages: {
                    size: this.messageCache.size,
                    max: this.options.messageCacheSize,
                },
                contacts: {
                    size: this.contactCache.size,
                    max: this.options.contactCacheSize,
                },
                presence: {
                    size: this.presenceCache.size,
                    max: this.options.presenceCacheSize,
                },
            },
            pending: {
                metadata: this.pendingMeta.size,
                messages: this.pendingMessages.size,
            },
            queue: {
                size: this.metadataQueue.size,
                pending: this.metadataQueue.pending,
            },
        };
    }

    clear() {
        logger.info("Clearing all caches");
        
        this.chatCache.clear();
        this.groupMetaCache.clear();
        this.messageCache.clear();
        this.contactCache.clear();
        this.presenceCache.clear();
        this.pendingMeta.clear();
        this.pendingMessages.clear();
        this.metadataMutex.clear();

        this.emit("clear");
    }

    destroy() {
        if (this.disposed) {
            logger.warn("Store already disposed");
            return;
        }

        logger.info("Destroying store manager");
        
        this.disposed = true;

        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        if (this.metricsTimer) {
            clearInterval(this.metricsTimer);
            this.metricsTimer = null;
        }

        this.metadataQueue.clear();
        this.clear();
        this.removeAllListeners();

        logger.info("Store manager destroyed");
    }
}