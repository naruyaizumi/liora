/**
 * @file In-memory key-value store with SQLite backend and event processing
 * @module store/core
 * @description High-performance memory store with event queuing, TTL management,
 * and LRU/LFU eviction strategies for WhatsApp data synchronization.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { Database } from "bun:sqlite";
import { BufferJSON } from "baileys";

/**
 * Event priority levels for queue processing
 * @constant {Object}
 * @enum {number}
 * @property {number} CORE - High priority (0)
 * @property {number} AUX - Medium priority (1)
 * @property {number} NOISE - Low priority (2)
 */
const EVENT_PRIORITY = {
    CORE: 0,
    AUX: 1,
    NOISE: 2,
};

/**
 * Time-to-live (TTL) strategies for different data types (in seconds)
 * @constant {Object}
 * @private
 *
 * @strategy
 * - Short TTL: Presence, typing indicators
 * - Medium TTL: Messages, chats, calls
 * - Long TTL: Contacts, blocklists
 * - No TTL: Configuration data (0 = never expire)
 */
const TTL_STRATEGY = {
    message: 604800, // 7 days
    chat: 604800, // 7 days
    contact: 2592000, // 30 days
    group: 604800, // 7 days
    presence: 300, // 5 minutes
    typing: 60, // 1 minute
    receipt: 86400, // 1 day
    call: 259200, // 3 days
    blocklist: 2592000, // 30 days
    processed: 900, // 15 minutes
};

/**
 * Performance and resource management constants
 * @constant {Object}
 * @private
 */
const MAX_QUEUE_SIZE = 500;
const MAX_INFLIGHT_OPS = 100;
const CLEANUP_INTERVAL = 3600000; // 1 hour

/**
 * In-memory key-value store with event processing capabilities
 * @class MemoryStore
 * @exports MemoryStore
 *
 * @features
 * 1. SQLite in-memory backend for persistence
 * 2. Priority-based event queue with flow control
 * 3. Automatic TTL-based expiration
 * 4. LRU/LFU eviction for memory management
 * 5. Batch operations for performance
 * 6. Health monitoring and metrics
 * 7. Native Buffer serialization via Baileys BufferJSON
 *
 * @architecture
 * - Uses SQLite WITHOUT ROWID tables for optimal key-value storage
 * - Implements priority queue with configurable size limits
 * - Includes auto-cleanup with LFU (Least Frequently Used) eviction
 * - Provides atomic operations for data consistency
 */
export class MemoryStore {
    /**
     * Creates a new MemoryStore instance
     * @constructor
     * @returns {MemoryStore}
     *
     * @initialization
     * 1. Creates in-memory SQLite database
     * 2. Sets up table schema and indexes
     * 3. Prepares all SQL statements
     * 4. Starts event processor thread
     * 5. Starts automatic cleanup scheduler
     */
    constructor() {
        /**
         * SQLite database instance
         * @private
         * @type {Database}
         */
        this.db = new Database(":memory:", { strict: true });
        this._initDatabase();
        this._prepareStatements();

        /**
         * Event processing queue (FIFO with priority)
         * @private
         * @type {Array<Object>}
         */
        this.eventQueue = [];

        /**
         * Number of currently executing operations
         * @private
         * @type {number}
         */
        this.inflightOps = 0;

        /**
         * Count of dropped events due to queue overflow
         * @private
         * @type {number}
         */
        this.droppedEvents = 0;

        /**
         * Whether event processor is currently running
         * @private
         * @type {boolean}
         */
        this.processing = false;

        this._startEventProcessor();
        this._startAutoCleanup();
    }

    /**
     * Initializes SQLite database with optimized configuration
     * @private
     * @method _initDatabase
     * @returns {void}
     *
     * @optimizations
     * - MEMORY journal mode for speed
     * - EXCLUSIVE locking for single-writer
     * - WITHOUT ROWID for key-value efficiency
     * - Indexes for common query patterns
     */
    _initDatabase() {
        // Performance optimizations
        this.db.exec("PRAGMA journal_mode = MEMORY");
        this.db.exec("PRAGMA synchronous = OFF");
        this.db.exec("PRAGMA temp_store = MEMORY");
        this.db.exec("PRAGMA locking_mode = EXCLUSIVE");
        this.db.exec("PRAGMA page_size = 8192");
        this.db.exec("PRAGMA cache_size = -16384");

        // Main key-value table - changed BLOB to TEXT for JSON storage
        this.db.exec(`
      CREATE TABLE kv (
        k TEXT PRIMARY KEY NOT NULL,
        v TEXT NOT NULL,
        t TEXT NOT NULL,
        e INTEGER NOT NULL,
        p INTEGER NOT NULL DEFAULT 0,
        c INTEGER NOT NULL DEFAULT 0
      ) WITHOUT ROWID;
    `);

        // Indexes for performance
        this.db.exec("CREATE INDEX idx_expire ON kv(e) WHERE e > 0;");
        this.db.exec("CREATE INDEX idx_type ON kv(t);");
    }

    /**
     * Prepares all SQL statements for reuse
     * @private
     * @method _prepareStatements
     * @returns {void}
     *
     * @statements
     * - stmtGet: Retrieve single value
     * - stmtSet: Insert/update value
     * - stmtDel: Delete key-value pair
     * - stmtExists: Check key existence
     * - stmtKeys: Get keys matching pattern
     * - stmtCleanup: Remove expired entries
     * - stmtTouch: Update access frequency
     * - stmtEvict: LFU eviction
     * - stmtBatchGet: Multi-key retrieval
     * - stmtBatchSet: Batch insert/update
     */
    _prepareStatements() {
        this.stmtGet = this.db.query("SELECT v FROM kv WHERE k = ? AND (e = 0 OR e > unixepoch())");
        this.stmtSet = this.db.query(
            "INSERT OR REPLACE INTO kv (k, v, t, e, p, c) VALUES (?, ?, ?, ?, ?, unixepoch())"
        );
        this.stmtDel = this.db.query("DELETE FROM kv WHERE k = ?");
        this.stmtExists = this.db.query(
            "SELECT 1 FROM kv WHERE k = ? AND (e = 0 OR e > unixepoch())"
        );
        this.stmtKeys = this.db.query(
            "SELECT k FROM kv WHERE k LIKE ? AND (e = 0 OR e > unixepoch())"
        );
        this.stmtCleanup = this.db.query("DELETE FROM kv WHERE e > 0 AND e <= unixepoch()");
        this.stmtTouch = this.db.query("UPDATE kv SET p = p + 1 WHERE k = ?");
        this.stmtEvict = this.db.query(`
      DELETE FROM kv WHERE k IN (
        SELECT k FROM kv WHERE e = 0 ORDER BY p ASC, c ASC LIMIT ?
      )
    `);

        this.stmtBatchGet = this.db.prepare(`
      SELECT k, v FROM kv 
      WHERE k IN (SELECT value FROM json_each(?)) 
      AND (e = 0 OR e > unixepoch())
    `);

        this.stmtBatchSet = this.db.prepare(`
      INSERT OR REPLACE INTO kv (k, v, t, e, p, c) 
      VALUES (?, ?, ?, ?, ?, unixepoch())
    `);
    }

    /**
     * Starts the event processing loop
     * @private
     * @method _startEventProcessor
     * @returns {void}
     *
     * @algorithm
     * 1. Check if processor is idle and queue has items
     * 2. Process up to MAX_INFLIGHT_OPS events concurrently
     * 3. Mark processing status to prevent race conditions
     * 4. Use setImmediate for non-blocking async processing
     */
    _startEventProcessor() {
        const process = () => {
            if (this.processing || this.eventQueue.length === 0) {
                setImmediate(process);
                return;
            }

            this.processing = true;

            while (this.eventQueue.length > 0 && this.inflightOps < MAX_INFLIGHT_OPS) {
                const event = this.eventQueue.shift();
                if (!event) break;

                this.inflightOps++;
                this._processEvent(event).finally(() => {
                    this.inflightOps--;
                });
            }

            this.processing = false;
            setImmediate(process);
        };

        setImmediate(process);
    }

    /**
     * Processes a single event from the queue
     * @private
     * @async
     * @method _processEvent
     * @param {Object} event - Event object with type and data
     * @returns {Promise<void>}
     */
    async _processEvent(event) {
        const { type, data } = event;

        try {
            await this._executeEvent(type, data);
        } catch (e) {
            global.logger?.error({ error: e.message, type }, "Event processing error");
        }
    }

    /**
     * Executes event-specific logic (to be overridden by bindings)
     * @private
     * @async
     * @method _executeEvent
     * @returns {Promise<void>}
     */
    async _executeEvent() {
        // Placeholder for event-specific implementations
        // Overridden in bind() function from store/bind module
    }

    /**
     * Starts automatic cleanup scheduler
     * @private
     * @method _startAutoCleanup
     * @returns {void}
     *
     * @tasks
     * 1. Remove expired entries (TTL-based)
     * 2. Evict least frequently used items (LFU)
     * 3. Log cleanup statistics
     * 4. Runs hourly + initial cleanup after 1 minute
     */
    _startAutoCleanup() {
        const cleanup = () => {
            try {
                // Remove expired entries
                const deleted = this.stmtCleanup.run();

                if (deleted.changes > 0) {
                    global.logger?.debug({ deleted: deleted.changes }, "Expired entries cleaned");
                }

                // LFU eviction for non-expiring entries
                const count = this.db.query("SELECT COUNT(*) as c FROM kv WHERE e = 0").get();
                const maxNonExpiring = 10000;

                if (count.c > maxNonExpiring) {
                    const toEvict = count.c - maxNonExpiring;
                    this.stmtEvict.run(toEvict);
                    global.logger?.debug({ evicted: toEvict }, "LFU eviction performed");
                }
            } catch (e) {
                global.logger?.error({ error: e.message }, "Cleanup error");
            }
        };

        // Schedule periodic cleanup
        setInterval(cleanup, CLEANUP_INTERVAL);
        // Initial cleanup after 1 minute
        setTimeout(cleanup, 60000);
    }

    /**
     * Adds an event to the processing queue
     * @method enqueueEvent
     * @param {string} type - Event type identifier
     * @param {*} data - Event payload
     * @param {number} [priority=EVENT_PRIORITY.CORE] - Event priority
     * @returns {void}
     *
     * @queueBehavior
     * - If queue full and priority is NOISE: drop event
     * - If queue full and priority higher: drop oldest event
     * - Maintains FIFO order within same priority
     */
    enqueueEvent(type, data, priority = EVENT_PRIORITY.CORE) {
        if (this.eventQueue.length >= MAX_QUEUE_SIZE) {
            if (priority === EVENT_PRIORITY.NOISE) {
                this.droppedEvents++;
                return;
            }
            this.eventQueue.shift();
        }

        this.eventQueue.push({ type, data, priority });
    }

    /**
     * Gets TTL value for a data type
     * @private
     * @method _getTTL
     * @param {string} type - Data type identifier
     * @returns {number} TTL in seconds (0 for no expiration)
     */
    _getTTL(type) {
        return TTL_STRATEGY[type] || TTL_STRATEGY.chat;
    }

    /**
     * Atomically sets a key-value pair with type-specific TTL
     * @method atomicSet
     * @param {string} key - Storage key
     * @param {*} value - Value to store (any JSON-serializable type)
     * @param {string} [type="chat"] - Data type for TTL selection
     * @returns {void}
     *
     * @serialization
     * - Uses Baileys BufferJSON for proper Buffer handling
     * - Includes metadata: type, expiration timestamp, access frequency
     * - Handles serialization errors with detailed logging
     */
    atomicSet(key, value, type = "chat") {
        const ttl = this._getTTL(type);
        const expireAt = ttl > 0 ? Math.floor(Date.now() / 1000) + ttl : 0;

        try {
            const serialized = JSON.stringify(value, BufferJSON.replacer);
            this.stmtSet.run(key, serialized, type, expireAt, 0);
        } catch (e) {
            global.logger?.error(
                {
                    error: e.message,
                    key,
                    valueType: typeof value,
                    valueKeys: value && typeof value === "object" ? Object.keys(value) : "N/A",
                },
                "Atomic set error"
            );
        }
    }

    /**
     * Alias for atomicSet (legacy compatibility)
     * @method set
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @param {string} [type="chat"] - Data type for TTL
     * @returns {void}
     */
    set(key, value, type = "chat") {
        return this.atomicSet(key, value, type);
    }

    /**
     * Retrieves a value by key
     * @method get
     * @param {string} key - Storage key
     * @returns {*|null} Deserialized value or null if not found/expired
     *
     * @optimization
     * - Increments access frequency asynchronously (LFU tracking)
     * - Uses prepared statement for performance
     * - Handles deserialization errors gracefully
     * - Uses BufferJSON.reviver for proper Buffer reconstruction
     */
    get(key) {
        try {
            const row = this.stmtGet.get(key);
            if (!row) return null;

            // Update access frequency for LFU tracking (non-blocking)
            setImmediate(() => {
                try {
                    this.stmtTouch.run(key);
                } catch {
                    // Silent fail - frequency update is best-effort
                }
            });

            return JSON.parse(row.v, BufferJSON.reviver);
        } catch (e) {
            global.logger?.error({ error: e.message, key }, "Get error");
            return null;
        }
    }

    /**
     * Deletes a key-value pair
     * @method del
     * @param {string} key - Storage key to delete
     * @returns {void}
     */
    del(key) {
        try {
            this.stmtDel.run(key);
        } catch (e) {
            global.logger?.error({ error: e.message, key }, "Del error");
        }
    }

    /**
     * Checks if a key exists and is not expired
     * @method exists
     * @param {string} key - Storage key to check
     * @returns {boolean} True if key exists and is valid
     */
    exists(key) {
        try {
            return !!this.stmtExists.get(key);
        } catch {
            return false;
        }
    }

    /**
     * Retrieves keys matching a pattern
     * @method keys
     * @param {string} pattern - Pattern with * wildcards
     * @returns {Array<string>} Array of matching keys
     *
     * @pattern
     * - Converts * to SQL LIKE % wildcard
     * - Example: "prefix:*" matches all keys starting with "prefix:"
     */
    keys(pattern) {
        try {
            const sqlPattern = pattern.replace(/\*/g, "%");
            const rows = this.stmtKeys.all(sqlPattern);
            return rows.map((r) => r.k);
        } catch {
            return [];
        }
    }

    /**
     * Retrieves multiple values in batch
     * @method mget
     * @param {Array<string>} keys - Array of keys to retrieve
     * @returns {Array<*>} Array of values in same order as input keys
     *
     * @performance
     * - Single SQL query for all keys
     * - Preserves null for missing/expired keys
     */
    mget(keys) {
        if (keys.length === 0) return [];

        try {
            const stmt = this.db.query(`
        SELECT k, v FROM kv 
        WHERE k IN (${keys.map(() => "?").join(",")}) 
        AND (e = 0 OR e > unixepoch())
      `);

            const rows = stmt.all(...keys);
            const map = new Map(rows.map((r) => [r.k, JSON.parse(r.v, BufferJSON.reviver)]));

            return keys.map((k) => map.get(k) || null);
        } catch {
            return keys.map(() => null);
        }
    }

    /**
     * Sets multiple key-value pairs in a single transaction
     * @method setMany
     * @param {Array<[string, *]>} items - Array of [key, value] pairs
     * @param {string} [type="chat"] - Data type for TTL
     * @returns {void}
     *
     * @transaction
     * - Uses SQLite transaction for atomicity
     * - Applies same TTL to all items
     */
    setMany(items, type = "chat") {
        if (items.length === 0) return;

        const ttl = this._getTTL(type);
        const expireAt = ttl > 0 ? Math.floor(Date.now() / 1000) + ttl : 0;

        try {
            const transaction = this.db.transaction((items) => {
                for (const [key, value] of items) {
                    const serialized = JSON.stringify(value, BufferJSON.replacer);
                    this.stmtBatchSet.run(key, serialized, type, expireAt, 0);
                }
            });

            transaction(items);
        } catch (e) {
            global.logger?.error({ error: e.message }, "SetMany error");
        }
    }

    /**
     * Retrieves multiple key-value pairs as a Map
     * @method bulkGet
     * @param {Array<string>} keys - Array of keys to retrieve
     * @returns {Map<string, *>} Map of key-value pairs
     *
     * @optimization
     * - Uses JSON array for IN clause (better for large key sets)
     * - Returns only existing key-value pairs
     */
    bulkGet(keys) {
        if (keys.length === 0) return new Map();

        try {
            const keysJson = JSON.stringify(keys);
            const rows = this.stmtBatchGet.all(keysJson);

            const result = new Map();
            for (const row of rows) {
                try {
                    result.set(row.k, JSON.parse(row.v, BufferJSON.reviver));
                } catch (e) {
                    global.logger?.debug(
                        { key: row.k, error: e.message },
                        "Failed to decode value"
                    );
                }
            }

            return result;
        } catch (e) {
            global.logger?.error({ error: e.message }, "BulkGet error");
            return new Map();
        }
    }

    /**
     * Scans for keys matching pattern with limit
     * @method scan
     * @param {string} pattern - Pattern with * wildcards
     * @param {number} [limit=100] - Maximum number of results
     * @returns {Array<Object>} Array of {key, value} objects
     */
    scan(pattern, limit = 100) {
        try {
            const sqlPattern = pattern.replace(/\*/g, "%");
            const rows = this.db
                .query(
                    `
        SELECT k, v FROM kv 
        WHERE k LIKE ? AND (e = 0 OR e > unixepoch())
        LIMIT ?
      `
                )
                .all(sqlPattern, limit);

            return rows.map((row) => ({
                key: row.k,
                value: JSON.parse(row.v, BufferJSON.reviver),
            }));
        } catch (e) {
            global.logger?.error({ error: e.message, pattern }, "Scan error");
            return [];
        }
    }

    /**
     * Increments a numeric value (or sets if not exists)
     * @method increment
     * @param {string} key - Storage key
     * @param {number} [amount=1] - Increment amount
     * @param {string} [type="processed"] - Data type for TTL
     * @returns {number} New value after increment
     */
    increment(key, amount = 1, type = "processed") {
        const current = this.get(key) || 0;
        const newValue = typeof current === "number" ? current + amount : amount;
        this.set(key, newValue, type);
        return newValue;
    }

    /**
     * Retrieves detailed store statistics
     * @method getStats
     * @returns {Object} Store statistics object
     *
     * @metrics
     * - Health status
     * - Entry counts by type
     * - Queue and operation metrics
     * - Memory usage estimates
     */
    getStats() {
        try {
            const stats = this.db
                .query(
                    `
        SELECT 
          t as type,
          COUNT(*) as count,
          SUM(LENGTH(v)) as total_size
        FROM kv 
        WHERE e = 0 OR e > unixepoch()
        GROUP BY t
      `
                )
                .all();

            const total = this.db
                .query("SELECT COUNT(*) as total FROM kv WHERE e = 0 OR e > unixepoch()")
                .get();

            return {
                healthy: true,
                totalEntries: total.total,
                queueSize: this.eventQueue.length,
                inflightOps: this.inflightOps,
                droppedEvents: this.droppedEvents,
                types: stats,
            };
        } catch (e) {
            return {
                healthy: false,
                error: e.message,
            };
        }
    }

    /**
     * Gracefully disconnects and cleans up resources
     * @method disconnect
     * @returns {void}
     *
     * @cleanup
     * - Finalizes all prepared statements
     * - Closes database connection
     * - Clears event queue
     * - Resets operation counters
     */
    disconnect() {
        try {
            this.stmtGet?.finalize();
            this.stmtSet?.finalize();
            this.stmtDel?.finalize();
            this.stmtExists?.finalize();
            this.stmtKeys?.finalize();
            this.stmtCleanup?.finalize();
            this.stmtTouch?.finalize();
            this.stmtEvict?.finalize();
            this.stmtBatchGet?.finalize();
            this.stmtBatchSet?.finalize();

            this.db.close();

            this.eventQueue = [];
            this.inflightOps = 0;
            this.processing = false;

            global.logger?.info("MemoryStore disconnected");
        } catch (e) {
            global.logger?.error({ error: e.message }, "Disconnect error");
        }
    }

    /**
     * Checks if store is operational
     * @method isHealthy
     * @returns {boolean} True if store can execute queries
     */
    isHealthy() {
        try {
            this.db.query("SELECT 1").get();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Retrieves performance and health metrics
     * @method getMetrics
     * @returns {Object} Metrics object
     */
    getMetrics() {
        try {
            const stats = this.db
                .query("SELECT COUNT(*) as total FROM kv WHERE e = 0 OR e > unixepoch()")
                .get();
            const memory = this.db.query("SELECT SUM(LENGTH(v)) as size FROM kv").get();

            return {
                healthy: this.isHealthy(),
                inflightOps: this.inflightOps,
                queueSize: this.eventQueue.length,
                droppedEvents: this.droppedEvents,
                totalEntries: stats.total,
                totalSize: memory.size || 0,
                processing: this.processing,
            };
        } catch {
            return {
                healthy: false,
                inflightOps: this.inflightOps,
                queueSize: this.eventQueue.length,
                droppedEvents: this.droppedEvents,
            };
        }
    }
}

export { EVENT_PRIORITY };
