/**
 * @file Baileys authentication database with caching and write buffering
 * @module database/auth
 * @description SQLite-based storage system for Baileys session management
 * with memory caching, write buffering, and automatic vacuuming.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import { Database } from "bun:sqlite";
import { Mutex } from "async-mutex";
import { BufferJSON } from "baileys";
import {
    DEFAULT_DB,
    validateKey,
    validateValue,
    initializeSignalHandlers,
    registerSignalHandler,
} from "./config.js";

/**
 * Write buffer for batching database operations
 * @class WriteBuffer
 * @private
 *
 * @design
 * - Accumulates upserts and deletes in memory
 * - Prevents duplicate operations on same key
 * - Enables batch transaction commits
 */
class WriteBuffer {
    constructor() {
        /**
         * Map of keys to values for upsert operations
         * @private
         * @type {Map<string, *>}
         */
        this.upserts = new Map();

        /**
         * Set of keys for delete operations
         * @private
         * @type {Set<string>}
         */
        this.deletes = new Set();
    }

    /**
     * Adds or updates a key-value pair in the buffer
     * @method addUpsert
     * @param {string} k - Key to upsert
     * @param {*} v - Value to store
     * @returns {boolean} True if operation was successful
     *
     * @sideEffects
     * - Removes key from deletes set if present
     * - Updates upserts map with new value
     */
    addUpsert(k, v) {
        if (!validateKey(k)) return false;
        this.upserts.set(k, v);
        this.deletes.delete(k);
        return true;
    }

    /**
     * Marks a key for deletion in the buffer
     * @method addDelete
     * @param {string} k - Key to delete
     * @returns {boolean} True if operation was successful
     *
     * @sideEffects
     * - Removes key from upserts if present
     * - Adds key to deletes set
     */
    addDelete(k) {
        if (!validateKey(k)) return false;
        this.deletes.add(k);
        this.upserts.delete(k);
        return true;
    }

    /**
     * Clears all buffered operations
     * @method clear
     * @returns {void}
     */
    clear() {
        this.upserts.clear();
        this.deletes.clear();
    }

    /**
     * Checks if buffer contains pending changes
     * @method hasChanges
     * @returns {boolean} True if buffer has upserts or deletes
     */
    hasChanges() {
        return this.upserts.size > 0 || this.deletes.size > 0;
    }

    /**
     * Converts buffer contents to arrays for transaction processing
     * @method toArrays
     * @returns {Object} Object containing upserts and deletes arrays
     *
     * @property {Array<[string, *]>} upserts - Key-value pairs for insertion/update
     * @property {Array<string>} deletes - Keys for deletion
     */
    toArrays() {
        return {
            upserts: Array.from(this.upserts.entries()),
            deletes: Array.from(this.deletes.values()),
        };
    }
}

/**
 * Main authentication database class with caching and buffering
 * @class AuthDatabase
 * @exports AuthDatabase
 *
 * @features
 * 1. Memory caching with LRU-like access tracking
 * 2. Write buffering with periodic flushing
 * 3. Automatic vacuuming of old records
 * 4. SQLite WAL mode for concurrent access
 * 5. Graceful shutdown handling
 * 6. Native Buffer serialization via Baileys BufferJSON
 *
 * @performance
 * - Cache-first read strategy
 * - Batch write operations
 * - Prepared statement reuse
 * - Incremental vacuuming
 */
class AuthDatabase {
    /**
     * Creates a new authentication database instance
     * @constructor
     * @param {string} [dbPath=DEFAULT_DB] - Path to SQLite database file
     * @param {Object} [options={}] - Configuration options
     * @param {number} [options.flushIntervalMs=200] - Buffer flush interval in milliseconds
     * @param {number} [options.maxBatch=1000] - Maximum batch size per transaction
     * @param {boolean} [options.vacuumEnabled=true] - Enable automatic vacuuming
     * @param {number} [options.vacuumIntervalMs=3600000] - Vacuum check interval (1 hour)
     * @param {number} [options.vacuumMaxAge=604800] - Max age of records to keep (7 days)
     * @param {number} [options.vacuumBatchSize=500] - Records to vacuum per batch
     *
     * @throws {Error} If database initialization fails
     */
    constructor(dbPath = DEFAULT_DB, options = {}) {
        /**
         * Database file path
         * @private
         * @type {string}
         */
        this.dbPath = dbPath;

        /**
         * Unique instance identifier
         * @private
         * @type {string}
         */
        this.instanceId = `auth-${Date.now()}-${Bun.randomUUIDv7("base64url")}`;

        /**
         * Whether instance has been disposed
         * @private
         * @type {boolean}
         */
        this.disposed = false;

        /**
         * Whether instance is fully initialized
         * @private
         * @type {boolean}
         */
        this.isInitialized = false;

        /**
         * In-memory cache for quick access
         * @private
         * @type {Map<string, *>}
         */
        this.cache = new Map();

        try {
            this.db = this._initDatabase();
            this._prepareStatements();
            this._initWriteBuffer(options);
            this._initVacuum(options);
            this._registerCleanup();
            this.isInitialized = true;
        } catch (e) {
            global.logger.fatal({
                err: e.message,
                context: "AuthDatabase constructor",
            });
            throw e;
        }
    }

    /**
     * Initializes SQLite database with optimized settings
     * @private
     * @method _initDatabase
     * @returns {Database} Bun SQLite database instance
     * @throws {Error} If database creation or configuration fails
     *
     * @optimizations
     * - WAL journal mode for better concurrency
     * - 128MB cache size
     * - 128MB memory mapping
     * - 8KB page size for better I/O
     * - WITHOUT ROWID for key-value storage
     */
    _initDatabase() {
        try {
            const db = new Database(this.dbPath, {
                create: true,
                readwrite: true,
                strict: true,
            });

            // Performance optimizations
            db.exec("PRAGMA journal_mode = WAL");
            db.exec("PRAGMA synchronous = NORMAL");
            db.exec("PRAGMA temp_store = MEMORY");
            db.exec("PRAGMA cache_size = -131072");
            db.exec("PRAGMA mmap_size = 134217728");
            db.exec("PRAGMA page_size = 8192");
            db.exec("PRAGMA auto_vacuum = INCREMENTAL");
            db.exec("PRAGMA busy_timeout = 5000");

            // Main storage table
            db.exec(`
                CREATE TABLE IF NOT EXISTS baileys_state (
                    key   TEXT PRIMARY KEY NOT NULL CHECK(length(key) > 0 AND length(key) < 512),
                    value TEXT NOT NULL,
                    last_access INTEGER DEFAULT (unixepoch())
                ) WITHOUT ROWID;
            `);

            // Indexes for performance
            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_key_prefix ON baileys_state(key) 
                WHERE key LIKE '%-%';
            `);

            db.exec(`
                CREATE INDEX IF NOT EXISTS idx_last_access ON baileys_state(last_access);
            `);

            return db;
        } catch (e) {
            global.logger.fatal({
                err: e.message,
                context: "_initDatabase",
            });
            throw e;
        }
    }

    /**
     * Prepares all SQL statements for reuse
     * @private
     * @method _prepareStatements
     * @throws {Error} If statement preparation fails
     *
     * @statements
     * - stmtGet: Retrieve single record
     * - stmtSet: Insert/update record
     * - stmtDel: Delete record
     * - stmtUpdateAccess: Update last access time
     * - stmtGetOldKeys: Get keys older than threshold
     * - stmtCountKeys: Count total keys
     * - txCommit: Batch transaction handler
     */
    _prepareStatements() {
        try {
            this.stmtGet = this.db.query("SELECT value FROM baileys_state WHERE key = ?");

            this.stmtSet = this.db.query(
                "INSERT OR REPLACE INTO baileys_state (key, value, last_access) VALUES (?, ?, unixepoch())"
            );

            this.stmtDel = this.db.query("DELETE FROM baileys_state WHERE key = ?");

            this.stmtUpdateAccess = this.db.query(
                "UPDATE baileys_state SET last_access = unixepoch() WHERE key = ?"
            );

            this.stmtGetOldKeys = this.db.query(
                "SELECT key FROM baileys_state WHERE last_access < ? AND key LIKE '%-%' LIMIT ?"
            );

            this.stmtCountKeys = this.db.query(
                "SELECT COUNT(*) as count FROM baileys_state WHERE key LIKE '%-%'"
            );

            this.txCommit = this.db.transaction((upsertsArr, deletesArr) => {
                const maxBatch = this.maxBatch;

                for (let i = 0; i < upsertsArr.length; i += maxBatch) {
                    const slice = upsertsArr.slice(i, i + maxBatch);
                    for (const [k, v] of slice) {
                        try {
                            // Use Baileys BufferJSON for proper Buffer serialization
                            const jsonString = JSON.stringify(v, BufferJSON.replacer);
                            this.stmtSet.run(k, jsonString);
                        } catch (e) {
                            global.logger.error({
                                err: e.message,
                                key: k,
                                context: "txCommit upsert",
                            });
                        }
                    }
                }

                for (let i = 0; i < deletesArr.length; i += maxBatch) {
                    const slice = deletesArr.slice(i, i + maxBatch);
                    for (const k of slice) {
                        try {
                            this.stmtDel.run(k);
                        } catch (e) {
                            global.logger.error({
                                err: e.message,
                                key: k,
                                context: "txCommit delete",
                            });
                        }
                    }
                }
            });
        } catch (e) {
            global.logger.fatal({
                err: e.message,
                context: "_prepareStatements",
            });
            throw e;
        }
    }

    /**
     * Initializes write buffering system
     * @private
     * @method _initWriteBuffer
     * @param {Object} options - Configuration options
     *
     * @components
     * - writeBuffer: Accumulates operations
     * - writeMutex: Ensures thread-safe flushing
     * - flushTimer: Periodic flush scheduler
     */
    _initWriteBuffer(options) {
        this.writeBuffer = new WriteBuffer();
        this.writeMutex = new Mutex();
        this.flushIntervalMs = Number(options.flushIntervalMs ?? 200);
        this.maxBatch = Number(options.maxBatch ?? 1000);
        this.flushTimer = null;
    }

    /**
     * Initializes automatic vacuuming system
     * @private
     * @method _initVacuum
     * @param {Object} options - Configuration options
     *
     * @purpose
     * - Removes old, unused records
     * - Maintains database performance
     * - Prevents unbounded growth
     */
    _initVacuum(options) {
        this.vacuumEnabled = options.vacuumEnabled !== false;
        this.vacuumIntervalMs = Number(options.vacuumIntervalMs ?? 3600000);
        this.vacuumMaxAge = Number(options.vacuumMaxAge ?? 604800);
        this.vacuumBatchSize = Number(options.vacuumBatchSize ?? 500);
        this.vacuumTimer = null;
        this.lastVacuumTime = 0;

        if (this.vacuumEnabled) {
            this._scheduleVacuum();
        }
    }

    /**
     * Schedules next vacuum operation
     * @private
     * @method _scheduleVacuum
     * @returns {void}
     *
     * @safety
     * - Checks disposed state before scheduling
     * - Clears existing timer to prevent duplicates
     * - Uses unref() to prevent blocking exit
     */
    _scheduleVacuum() {
        if (!this.vacuumEnabled || this.disposed || !this.isInitialized) return;

        if (this.vacuumTimer) {
            clearTimeout(this.vacuumTimer);
        }

        this.vacuumTimer = setTimeout(() => {
            this.vacuumTimer = null;
            this._performVacuum().catch((e) => {
                global.logger.error({
                    err: e.message,
                    context: "_scheduleVacuum",
                });
            });
        }, this.vacuumIntervalMs);

        this.vacuumTimer.unref?.();
    }

    /**
     * Performs vacuuming of old records
     * @private
     * @async
     * @method _performVacuum
     * @returns {Promise<void>}
     *
     * @process
     * 1. Calculate cutoff time based on vacuumMaxAge
     * 2. Count total records for logging
     * 3. Fetch old keys in batches
     * 4. Delete old records and clear cache
     * 5. Perform incremental vacuum
     */
    async _performVacuum() {
        if (this.disposed || !this.isInitialized) return;

        const now = Date.now();
        if (now - this.lastVacuumTime < this.vacuumIntervalMs) {
            this._scheduleVacuum();
            return;
        }

        await this.writeMutex.runExclusive(async () => {
            try {
                const cutoffTime = Math.floor(Date.now() / 1000) - this.vacuumMaxAge;

                const countResult = this.stmtCountKeys.get();
                const totalKeys = countResult?.count || 0;

                if (totalKeys === 0) {
                    global.logger.debug("No keys to vacuum");
                    this.lastVacuumTime = now;
                    this._scheduleVacuum();
                    return;
                }

                const oldKeys = this.stmtGetOldKeys.all(cutoffTime, this.vacuumBatchSize);

                if (oldKeys.length === 0) {
                    global.logger.debug("No old keys found for vacuum");
                    this.lastVacuumTime = now;
                    this._scheduleVacuum();
                    return;
                }

                let deletedCount = 0;
                this.db.transaction(() => {
                    for (const row of oldKeys) {
                        try {
                            this.stmtDel.run(row.key);
                            this.cache.delete(row.key);
                            deletedCount++;
                        } catch (e) {
                            global.logger.error({
                                err: e.message,
                                key: row.key,
                                context: "_performVacuum delete",
                            });
                        }
                    }
                })();

                if (deletedCount > 0) {
                    this.db.exec("PRAGMA incremental_vacuum");
                    this.db.exec("PRAGMA wal_checkpoint(PASSIVE)");

                    global.logger.info({
                        deletedCount,
                        totalKeys,
                        context: "vacuum completed",
                    });
                }

                this.lastVacuumTime = now;
                this._scheduleVacuum();
            } catch (e) {
                global.logger.error({
                    err: e.message,
                    context: "_performVacuum",
                });
                this._scheduleVacuum();
            }
        });
    }

    /**
     * Registers cleanup handler for graceful shutdown
     * @private
     * @method _registerCleanup
     * @returns {void}
     */
    _registerCleanup() {
        initializeSignalHandlers();
        registerSignalHandler(this.instanceId, () => this._cleanup());
    }

    /**
     * Retrieves value for a key (cache-first strategy)
     * @method get
     * @param {string} key - Key to retrieve
     * @returns {Object|undefined} Object with value property or undefined
     *
     * @strategy
     * 1. Check memory cache
     * 2. Query database if not in cache
     * 3. Parse JSON with BufferJSON.reviver for proper Buffer deserialization
     * 4. Update access time asynchronously
     * 5. Update cache for future requests
     */
    get(key) {
        if (!validateKey(key)) return undefined;

        if (this.cache.has(key)) {
            return { value: this.cache.get(key) };
        }

        try {
            const row = this.stmtGet.get(key);
            if (!row || !row.value) return undefined;

            let value;
            if (typeof row.value === "string") {
                // Use Baileys BufferJSON.reviver to properly reconstruct Buffers
                value = JSON.parse(row.value, BufferJSON.reviver);
            } else {
                global.logger.warn({
                    key,
                    valueType: typeof row.value,
                    context: "get: unknown data type, deleting",
                });
                this.del(key);
                return undefined;
            }

            this.cache.set(key, value);

            setImmediate(() => {
                try {
                    this.stmtUpdateAccess.run(key);
                } catch (e) {
                    global.logger.debug({
                        err: e.message,
                        key,
                        context: "get: update access time",
                    });
                }
            });

            return { value };
        } catch (e) {
            global.logger.error({ err: e.message, key, context: "get" });
            return undefined;
        }
    }

    /**
     * Stores a key-value pair (buffered write)
     * @method set
     * @param {string} key - Key to store
     * @param {*} value - Value to store
     * @returns {boolean} True if operation was successful
     *
     * @flow
     * 1. Validate key and value
     * 2. Update memory cache
     * 3. Add to write buffer
     * 4. Schedule flush if needed
     */
    set(key, value) {
        if (!validateKey(key) || !validateValue(value)) {
            global.logger.warn({
                key,
                context: "set: invalid key or value",
            });
            return false;
        }

        this.cache.set(key, value);
        this.writeBuffer.addUpsert(key, value);
        this._scheduleFlush();
        return true;
    }

    /**
     * Deletes a key-value pair (buffered delete)
     * @method del
     * @param {string} key - Key to delete
     * @returns {boolean} True if operation was successful
     */
    del(key) {
        if (!validateKey(key)) {
            global.logger.warn({ key, context: "del: invalid key" });
            return false;
        }

        this.cache.delete(key);
        this.writeBuffer.addDelete(key);
        this._scheduleFlush();
        return true;
    }

    /**
     * Schedules a buffer flush operation
     * @private
     * @method _scheduleFlush
     * @returns {void}
     */
    _scheduleFlush() {
        if (!this.flushTimer && !this.disposed && this.isInitialized) {
            this.flushTimer = setTimeout(() => {
                this.flushTimer = null;
                this.flush().catch((e) => {
                    global.logger.error({
                        err: e.message,
                        context: "_scheduleFlush",
                    });
                });
            }, this.flushIntervalMs);

            this.flushTimer.unref?.();
        }
    }

    /**
     * Flushes buffered operations to database
     * @async
     * @method flush
     * @returns {Promise<void>}
     *
     * @process
     * 1. Acquire write mutex
     * 2. Extract buffered operations
     * 3. Execute batch transaction
     * 4. Checkpoint WAL
     * 5. Re-buffer failed operations
     */
    async flush() {
        if (this.disposed || !this.isInitialized) return;

        await this.writeMutex.runExclusive(async () => {
            if (!this.writeBuffer.hasChanges()) return;

            const { upserts, deletes } = this.writeBuffer.toArrays();
            this.writeBuffer.clear();

            try {
                this.txCommit(upserts, deletes);
                this.db.exec("PRAGMA wal_checkpoint(PASSIVE)");
            } catch (e) {
                global.logger.error({
                    err: e.message,
                    context: "flush",
                });

                for (const [k, v] of upserts) {
                    this.writeBuffer.addUpsert(k, v);
                }
                for (const k of deletes) {
                    this.writeBuffer.addDelete(k);
                }
                throw e;
            }
        });
    }

    /**
     * Forces immediate vacuum operation
     * @async
     * @method forceVacuum
     * @returns {Promise<void>}
     */
    async forceVacuum() {
        if (!this.vacuumEnabled) {
            global.logger.warn("Vacuum is disabled");
            return;
        }

        this.lastVacuumTime = 0;
        await this._performVacuum();
    }

    /**
     * Performs cleanup and resource disposal
     * @private
     * @method _cleanup
     * @returns {void}
     *
     * @cleanupSteps
     * 1. Mark as disposed
     * 2. Clear timers
     * 3. Flush remaining buffer
     * 4. Finalize WAL and vacuum
     * 5. Close database connections
     * 6. Clear memory cache
     */
    _cleanup() {
        if (this.disposed) return;
        this.disposed = true;

        try {
            if (this.flushTimer) {
                clearTimeout(this.flushTimer);
                this.flushTimer = null;
            }

            if (this.vacuumTimer) {
                clearTimeout(this.vacuumTimer);
                this.vacuumTimer = null;
            }

            const { upserts, deletes } = this.writeBuffer.toArrays();
            if (upserts.length || deletes.length) {
                this.txCommit(upserts, deletes);
            }

            this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
            this.db.exec("PRAGMA incremental_vacuum");
            this.db.exec("PRAGMA optimize");

            this.stmtGet?.finalize();
            this.stmtDel?.finalize();
            this.stmtSet?.finalize();
            this.stmtUpdateAccess?.finalize();
            this.stmtGetOldKeys?.finalize();
            this.stmtCountKeys?.finalize();
            this.db.close();
            this.cache.clear();
        } catch (e) {
            global.logger.error({ err: e.message, context: "_cleanup" });
        }
    }
}

/**
 * Singleton database instance
 * @private
 * @type {AuthDatabase|null}
 */
let dbInstance = null;

/**
 * Gets or creates the singleton AuthDatabase instance
 * @function getAuthDatabase
 * @param {string} [dbPath=DEFAULT_DB] - Database file path
 * @param {Object} [options={}] - Configuration options
 * @returns {AuthDatabase} Singleton database instance
 *
 * @singletonPattern
 * - Creates instance if none exists
 * - Recreates if existing instance is disposed
 * - Returns existing instance otherwise
 */
export function getAuthDatabase(dbPath = DEFAULT_DB, options = {}) {
    if (!dbInstance || dbInstance.disposed) {
        dbInstance = new AuthDatabase(dbPath, options);
    }
    return dbInstance;
}

/**
 * Default export - singleton instance getter
 * @default
 * @type {Function}
 */
export default getAuthDatabase();
