import { RedisClient } from "bun";

const REDIS_PREFIX = "liora:chat:";
const REDIS_PRESENCE_PREFIX = "liora:presence:";
const REDIS_CONTACT_PREFIX = "liora:contact:";
const REDIS_GROUP_PREFIX = "liora:group:";
const REDIS_PROCESSED_PREFIX = "liora:processed:";
const REDIS_LOCK_PREFIX = "liora:lock:";

const EVENT_PRIORITY = {
  CORE: 0,
  AUX: 1,
};

const TTL_STRATEGY = {
  chat: 60 * 60 * 24 * 7, // 7 days
  contact: 60 * 60 * 24 * 30, // 30 days
  group: 60 * 60 * 24 * 7, // 7 days
  presence: 60 * 5, // 5 minutes
  processed: 60 * 15, // 15 minutes
  lock: 30, // 30 seconds
};

const MAX_QUEUE_SIZE_PER_PRIORITY = 100;
const MAX_INFLIGHT_OPS = 50;
const BACKPRESSURE_THRESHOLD = 0.8;
const MAX_PROCESSED_EVENTS = 1000;

const CLEANUP_INTERVAL = 60 * 60 * 24 * 1000; // 24 hours
const OLD_DATA_THRESHOLD = 60 * 60 * 24 * 7; // 7 days

export class RedisStore {
  constructor() {
    this.redis = null;
    this.useFallback = false;

    this.eventQueue = {
      [EVENT_PRIORITY.CORE]: [],
      [EVENT_PRIORITY.AUX]: [],
    };

    this.inflightOps = 0;
    this.droppedEvents = 0;
    this.processedEvents = new Set();

    this.initPromise = this._initRedis();
    this._startEventProcessor();
    this._startBackpressureMonitor();
    this._startAutoCleanup();
  }

  async _initRedis() {
    try {
      const redisUrl = Bun.env.REDIS_URL || "redis://localhost:6379";
      this.redis = new RedisClient(redisUrl);

      await this.redis.ping();

      this.useFallback = false;
      global.logger?.info("Redis connected successfully");
    } catch (e) {
      global.logger?.error(
        { error: e.message },
        "Redis init failed - using fallback mode",
      );
      this.useFallback = true;
    }
  }

  _startEventProcessor() {
    setInterval(() => {
      this._processEventQueue();
    }, 50);
  }

  async _processEventQueue() {
    if (this.inflightOps >= MAX_INFLIGHT_OPS) return;

    for (
      let priority = EVENT_PRIORITY.CORE;
      priority <= EVENT_PRIORITY.AUX;
      priority++
    ) {
      const queue = this.eventQueue[priority];

      if (queue.length === 0) continue;

      const batch = queue.splice(0, 10);

      for (const event of batch) {
        if (this.inflightOps >= MAX_INFLIGHT_OPS) {
          queue.unshift(...batch.slice(batch.indexOf(event)));
          break;
        }

        this.inflightOps++;
        this._processEvent(event).finally(() => {
          this.inflightOps--;
        });
      }

      break;
    }
  }

  async _processEvent(event) {
    const { type, data, eventId } = event;

    if (!(await this._isEventProcessed(eventId))) {
      try {
        await this._executeEvent(type, data);
        await this._markEventProcessed(eventId);
      } catch (e) {
        global.logger?.error(
          { error: e.message, type },
          "Event processing error",
        );
      }
    }
  }

  async _isEventProcessed(eventId) {
    if (this.useFallback) {
      return this.processedEvents.has(eventId);
    }

    const key = `${REDIS_PROCESSED_PREFIX}${eventId}`;
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch {
      return this.processedEvents.has(eventId);
    }
  }

  async _markEventProcessed(eventId) {
    this.processedEvents.add(eventId);

    if (this.processedEvents.size > MAX_PROCESSED_EVENTS) {
      const iterator = this.processedEvents.values();
      for (let i = 0; i < 100; i++) {
        const { value } = iterator.next();
        if (value) this.processedEvents.delete(value);
      }
    }

    if (this.useFallback) return;

    const key = `${REDIS_PROCESSED_PREFIX}${eventId}`;
    try {
      await this.redis.setex(key, TTL_STRATEGY.processed, "1");
    } catch {
      //
    }
  }

  async _executeEvent(type, data) {
    //
  }

  _startBackpressureMonitor() {
    setInterval(() => {
      const totalQueued = Object.values(this.eventQueue).reduce(
        (sum, queue) => sum + queue.length,
        0,
      );

      const pressure = totalQueued / (MAX_QUEUE_SIZE_PER_PRIORITY * 2);

      if (pressure > BACKPRESSURE_THRESHOLD) {
        const dropped = this.eventQueue[EVENT_PRIORITY.AUX].length;
        this.eventQueue[EVENT_PRIORITY.AUX] = [];
        this.droppedEvents += dropped;

        global.logger?.warn(
          {
            queued: totalQueued,
            pressure: (pressure * 100).toFixed(2) + "%",
            dropped,
          },
          "Backpressure: dropping aux events",
        );
      }
    }, 1000);
  }

  _startAutoCleanup() {
    setInterval(async () => {
      try {
        await this._cleanupOldData();
      } catch (e) {
        global.logger?.error({ error: e.message }, "Auto cleanup error");
      }
    }, CLEANUP_INTERVAL);

    setTimeout(() => {
      this._cleanupOldData().catch((e) =>
        global.logger?.error({ error: e.message }, "Initial cleanup error"),
      );
    }, 60000);
  }

  async _cleanupOldData() {
    if (this.useFallback) return;

    const now = Date.now();
    const threshold = now - OLD_DATA_THRESHOLD * 1000;

    global.logger?.info("Starting auto cleanup of old data...");

    try {
      let cleaned = 0;

      const presenceThreshold = now - 60 * 60 * 1000;
      const presenceKeys = await this.redis.keys(`${REDIS_PRESENCE_PREFIX}*`);
      for (const key of presenceKeys) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            const parsed = JSON.parse(data);
            const timestamp = parsed.timestamp || 0;

            if (timestamp < presenceThreshold) {
              await this.redis.del(key);
              cleaned++;
            }
          }
        } catch {
          //
        }
      }

      const processedKeys = await this.redis.keys(`${REDIS_PROCESSED_PREFIX}*`);
      for (const key of processedKeys) {
        const ttl = await this.redis.ttl(key);
        if (ttl < 0) {
          await this.redis.del(key);
          cleaned++;
        }
      }

      global.logger?.info({ cleaned }, "Auto cleanup completed");
    } catch (e) {
      global.logger?.error({ error: e.message }, "Cleanup error");
    }
  }

  enqueueEvent(type, data, priority = EVENT_PRIORITY.CORE) {
    const queue = this.eventQueue[priority];

    if (queue.length >= MAX_QUEUE_SIZE_PER_PRIORITY) {
      queue.shift();
    }

    const eventId = `${type}-${data?.id || Date.now()}-${Math.random()}`;
    queue.push({ type, data, eventId, priority });
  }

  _getAdaptiveTTL(type, data) {
    if (type === "presence") {
      const timeSinceUpdate = Date.now() - (data?.timestamp || Date.now());
      if (timeSinceUpdate < 60000) return 60;
      return TTL_STRATEGY.presence;
    }

    if (type === "contact") return TTL_STRATEGY.contact;
    if (type === "group") return TTL_STRATEGY.group;

    return TTL_STRATEGY.chat;
  }

  async atomicSet(key, value, type = "chat") {
    const lockKey = `${REDIS_LOCK_PREFIX}${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
    const ttl = this._getAdaptiveTTL(type, value);

    if (this.useFallback) {
      global.logger?.warn("Redis unavailable - data not persisted");
      return;
    }

    try {
      const acquired = await this.redis.setnx(lockKey, lockValue);

      if (acquired === 1) {
        await this.redis.expire(lockKey, TTL_STRATEGY.lock);

        await this.redis.setex(key, ttl, JSON.stringify(value));

        await this.redis.del(lockKey);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10));

        const retryAcquired = await this.redis.setnx(lockKey, lockValue);
        if (retryAcquired === 1) {
          await this.redis.expire(lockKey, TTL_STRATEGY.lock);
          await this.redis.setex(key, ttl, JSON.stringify(value));
          await this.redis.del(lockKey);
        }
      }
    } catch (e) {
      global.logger?.error({ error: e.message, key }, "Atomic set error");
    }
  }

  async set(key, value, ttl) {
    return this.atomicSet(key, value);
  }

  async get(key) {
    if (this.useFallback) {
      return null;
    }

    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      global.logger?.error({ error: e.message, key }, "Get error");
      return null;
    }
  }

  async del(key) {
    if (this.useFallback) return;

    try {
      await this.redis.del(key);
    } catch (e) {
      global.logger?.error({ error: e.message, key }, "Del error");
    }
  }

  async exists(key) {
    if (this.useFallback) return false;

    try {
      return (await this.redis.exists(key)) === 1;
    } catch {
      return false;
    }
  }

  async keys(pattern) {
    if (this.useFallback) return [];

    try {
      return await this.redis.keys(pattern);
    } catch {
      return [];
    }
  }

  async mget(keys) {
    if (this.useFallback) return keys.map(() => null);

    try {
      if (keys.length === 0) return [];

      const values = await this.redis.mget(keys);
      return values.map((v) => {
        if (!v) return null;
        try {
          return JSON.parse(v);
        } catch {
          return null;
        }
      });
    } catch {
      return keys.map(() => null);
    }
  }

  async disconnect() {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }

      this.eventQueue = {
        [EVENT_PRIORITY.CORE]: [],
        [EVENT_PRIORITY.AUX]: [],
      };
      this.processedEvents.clear();
    } catch (e) {
      global.logger?.error({ error: e.message }, "Disconnect error");
    }
  }

  isHealthy() {
    return !this.useFallback && this.redis !== null;
  }

  getMetrics() {
    const totalQueued = Object.values(this.eventQueue).reduce(
      (sum, queue) => sum + queue.length,
      0,
    );

    return {
      healthy: this.isHealthy(),
      fallback: this.useFallback,
      inflightOps: this.inflightOps,
      queueSize: totalQueued,
      droppedEvents: this.droppedEvents,
      processedEventsSize: this.processedEvents.size,
    };
  }
}

export {
  EVENT_PRIORITY,
  REDIS_PREFIX,
  REDIS_PRESENCE_PREFIX,
  REDIS_CONTACT_PREFIX,
  REDIS_GROUP_PREFIX,
};