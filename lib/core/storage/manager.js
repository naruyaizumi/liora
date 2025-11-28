import { EventEmitter } from "eventemitter3";
import PQueue from "p-queue";
import pino from "pino";
import {
    RedisPool,
    BatchManager,
    RedisLRUCache,
    RedisBlocklistCache,
    REDIS_PREFIX,
} from "./pool.js";

const logger = pino({
    level: "debug",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

export class StoreManager extends EventEmitter {
    constructor() {
        super();
        const redisUrl = Bun.env.REDIS_URL || "redis://localhost:6379";
        const poolSize = parseInt(Bun.env.REDIS_POOL_SIZE || "3");
        const chatTTL = parseInt(Bun.env.CACHE_TTL_SECS || "3600");
        const maxCacheSize = parseInt(Bun.env.CACHE_MAX_SIZE || "500");
        const batchInterval = parseInt(Bun.env.BATCH_DELAY_MS || "50");
        this.pool = new RedisPool(redisUrl, poolSize);
        this.batchManager = new BatchManager(this.pool, batchInterval);
        this.chatCache = new RedisLRUCache(
            this.pool,
            this.batchManager,
            REDIS_PREFIX.CHAT,
            maxCacheSize,
            chatTTL
        );
        this.groupMetaCache = new RedisLRUCache(
            this.pool,
            this.batchManager,
            REDIS_PREFIX.GROUP,
            200,
            600
        );
        this.messageCache = new RedisLRUCache(
            this.pool,
            this.batchManager,
            REDIS_PREFIX.MESSAGE,
            1000,
            1800
        );
        this.contactCache = new RedisLRUCache(
            this.pool,
            this.batchManager,
            REDIS_PREFIX.CONTACT,
            1000,
            7200
        );
        this.blocklistCache = new RedisBlocklistCache(this.pool, this.batchManager);

        this.queue = new PQueue({ concurrency: parseInt(Bun.env.MAX_CONCURRENT_OPS || "10") });
        this.pendingMetadataFetch = new Map();

        this.stats = {
            messagesProcessed: 0,
            chatsProcessed: 0,
            contactsProcessed: 0,
            errorsCount: 0,
            lastCleanup: Date.now(),
        };

        this.init();
    }

    async init() {
        try {
            await this.pool.init();

            await this.pool.execute(async (client) => {
                await client.set("liora:health", "ok");
                const health = await client.get("liora:health");
                if (health !== "ok") throw new Error("Health check failed");
            });

            this.startPeriodicCleanup();
        } catch (err) {
            logger.error({ err }, "Redis initialization error");
            throw err;
        }
    }

    async getChat(id) {
        return await this.chatCache.get(id);
    }

    async setChat(id, data) {
        return await this.chatCache.set(id, data);
    }

    async getGroupMeta(id) {
        return await this.groupMetaCache.get(id);
    }

    async setGroupMeta(id, metadata) {
        return await this.groupMetaCache.set(id, metadata);
    }

    async getMessage(id) {
        return await this.messageCache.get(id);
    }

    async setMessage(id, message) {
        return await this.messageCache.set(id, message);
    }

    async getContact(id) {
        return await this.contactCache.get(id);
    }

    async setContact(id, contact) {
        return await this.contactCache.set(id, contact);
    }

    async fetchGroupMetadata(conn, id, force = false) {
        if (!force) {
            const cached = await this.groupMetaCache.get(id);
            if (cached) return cached;
        }

        if (this.pendingMetadataFetch.has(id)) {
            return this.pendingMetadataFetch.get(id);
        }

        const promise = this.queue.add(async () => {
            try {
                const metadata = await conn.groupMetadata(id);
                if (metadata) {
                    await this.groupMetaCache.set(id, metadata);
                    this.emit("group-metadata:fetched", { id, metadata });
                }
                return metadata;
            } catch (err) {
                logger.warn({ err, id }, "Failed to fetch group metadata");
                this.stats.errorsCount++;
                return null;
            } finally {
                this.pendingMetadataFetch.delete(id);
            }
        });

        this.pendingMetadataFetch.set(id, promise);

        setTimeout(() => {
            if (this.pendingMetadataFetch.has(id)) {
                this.pendingMetadataFetch.delete(id);
            }
        }, 30000);

        return promise;
    }

    startPeriodicCleanup() {
        this.cleanupInterval = setInterval(() => {
            this.queue.add(async () => {
                try {
                    const [chatDeleted, groupDeleted, messageDeleted, contactDeleted] =
                        await Promise.all([
                            this.chatCache.cleanup(),
                            this.groupMetaCache.cleanup(),
                            this.messageCache.cleanup(),
                            this.contactCache.cleanup(),
                        ]);

                    const total = chatDeleted + groupDeleted + messageDeleted + contactDeleted;

                    if (total > 0) {
                        logger.warn(
                            `Cleanup: ${total} entries (chats: ${chatDeleted}, groups: ${groupDeleted}, messages: ${messageDeleted}, contacts: ${contactDeleted})`
                        );
                    }

                    this.stats.lastCleanup = Date.now();
                    this.emit("cleanup:completed", { deleted: total });
                } catch (err) {
                    logger.error({ err }, "Cleanup error");
                    this.stats.errorsCount++;
                }
            });
        }, 300000);
    }

    async syncToChats(conn) {
        if (!conn?.chats) return 0;

        return await this.queue.add(async () => {
            let synced = 0;
            const chatKeys = Object.keys(conn.chats);
            const checks = chatKeys
                .filter((key) => key !== "status@broadcast")
                .map(async (key) => {
                    const hasInRedis = await this.chatCache.has(key);
                    if (!hasInRedis) {
                        delete conn.chats[key];
                        synced++;
                    }
                });

            await Promise.all(checks);

            if (synced > 0) {
                logger.info(`Synced ${synced} stale chats removed`);
            }

            return synced;
        });
    }

    clear() {
        const chatCount = this.chatCache.clear();
        const groupCount = this.groupMetaCache.clear();
        const messageCount = this.messageCache.clear();
        const contactCount = this.contactCache.clear();

        this.blocklistCache.localSet.clear();
        this.pendingMetadataFetch.clear();
    }

    getStats() {
        return {
            ...this.stats,
            caches: {
                chats: this.chatCache.getStats(),
                groups: this.groupMetaCache.getStats(),
                messages: this.messageCache.getStats(),
                contacts: this.contactCache.getStats(),
            },
            queue: {
                size: this.queue.size,
                pending: this.queue.pending,
            },
            pool: this.pool.getStats(),
        };
    }

    async destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        await this.batchManager.destroy();
        await this.queue.onIdle();
        await this.pool.destroy();

        this.clear();
        this.removeAllListeners();
    }
}