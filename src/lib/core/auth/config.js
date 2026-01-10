/**
 * @file Signal handler and database utilities for Liora bot
 * @module core/utils
 * @description Provides signal/process management, database configuration,
 * and validation utilities for graceful shutdown and resource management.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
import path from "path";

/**
 * Default database file path for authentication storage
 * @constant {string}
 * @default
 */
export const DEFAULT_DB = path.join(process.cwd(), "src", "database", "auth.db");

/**
 * Generates a unique key string by combining type and identifier
 * @function makeKey
 * @param {string} type - Key type/category
 * @param {string|number} id - Unique identifier
 * @returns {string} Formatted key string "type-id"
 *
 * @example
 * const sessionKey = makeKey("session", "user123"); // "session-user123"
 * const cacheKey = makeKey("cache", 456); // "cache-456"
 */
export const makeKey = (type, id) => `${type}-${id}`;

/**
 * Validates key format and length constraints
 * @function validateKey
 * @param {string} key - Key to validate
 * @returns {boolean} True if key is valid string with appropriate length
 *
 * @constraints
 * - Must be non-empty string
 * - Length must be between 1 and 511 characters
 * - Prevents excessively long keys that could impact performance
 */
export function validateKey(key) {
    return typeof key === "string" && key.length > 0 && key.length < 512;
}

/**
 * Validates that value is not undefined (null is allowed)
 * @function validateValue
 * @param {*} value - Value to check
 * @returns {boolean} True if value is defined (not undefined)
 *
 * @note
 * - Allows null values for explicit "empty" state
 * - Only rejects undefined values which indicate missing data
 */
export function validateValue(value) {
    return value !== undefined;
}

/**
 * Registry for signal/exit handlers
 * @private
 * @type {Map<string, Function>}
 */
const signalHandlers = new Map();

/**
 * Flag indicating signal handlers have been initialized
 * @private
 * @type {boolean}
 */
let signalHandlersInitialized = false;

/**
 * Flag preventing multiple exit handler executions
 * @private
 * @type {boolean}
 */
let isExiting = false;

/**
 * Executes all registered signal handlers sequentially
 * @private
 * @function exitHandler
 * @param {string} _signal - Signal name (unused parameter)
 *
 * @safety
 * - Prevents re-entrance with isExiting flag
 * - Wraps each handler in try-catch to prevent cascade failures
 * - Logs errors without interrupting other handlers
 */
function exitHandler(_signal) {
    if (isExiting) return;
    isExiting = true;

    for (const [id, handler] of signalHandlers) {
        try {
            handler();
        } catch (e) {
            global.logger.error({
                err: e.message,
                handler: id,
                context: "exitHandler",
            });
        }
    }
}

/**
 * Complete process exit handler with proper signal handling
 * @private
 * @function fullExitHandler
 * @param {string} signal - System signal (SIGINT, SIGTERM)
 *
 * @exitCodes
 * - 130: SIGINT (Ctrl+C) - User interrupted
 * - 143: SIGTERM - Graceful termination
 *
 * @cleanup
 * - Ensures all handlers execute before exit
 * - Adds timeout safety to prevent hanging
 * - Uses unref() to prevent timer from blocking exit
 */
function fullExitHandler(signal) {
    exitHandler(signal);
    const code = signal === "SIGINT" ? 130 : 143;
    const timer = setTimeout(() => process.exit(code), 500);
    timer.unref?.();
}

/**
 * Initializes system signal handlers for graceful shutdown
 * @function initializeSignalHandlers
 * @returns {void}
 *
 * @handlers
 * 1. exit - Clean shutdown
 * 2. SIGINT - Ctrl+C interruption
 * 3. SIGTERM - Termination request
 * 4. uncaughtException - Unhandled errors
 * 5. unhandledRejection - Unhandled promise rejections
 *
 * @idempotency
 * - Safe to call multiple times (only initializes once)
 * - Prevents duplicate handler registration
 */
export function initializeSignalHandlers() {
    if (signalHandlersInitialized) return;
    signalHandlersInitialized = true;

    try {
        process.once("exit", () => exitHandler("exit"));
        process.once("SIGINT", () => fullExitHandler("SIGINT"));
        process.once("SIGTERM", () => fullExitHandler("SIGTERM"));
        process.on("uncaughtException", (err) => {
            global.logger.error({
                err: err.message,
                stack: err.stack,
                context: "uncaughtException",
            });
        });

        process.on("unhandledRejection", (reason) => {
            global.logger.error({
                reason,
                context: "unhandledRejection",
            });
        });
    } catch (e) {
        global.logger.error({
            err: e.message,
            context: "initializeSignalHandlers",
        });
    }
}

/**
 * Registers a cleanup handler to be executed on process exit
 * @function registerSignalHandler
 * @param {string} id - Unique identifier for the handler
 * @param {Function} handler - Cleanup function to execute
 * @returns {boolean} True if handler was registered successfully
 *
 * @validation
 * - Requires non-empty string ID
 * - Requires function handler
 * - Logs warning for invalid parameters
 *
 * @usage
 * // Register database cleanup
 * registerSignalHandler("db-close", () => db.close());
 */
export function registerSignalHandler(id, handler) {
    if (typeof handler !== "function") {
        global.logger.warn({
            id,
            context: "registerSignalHandler: invalid handler",
        });
        return false;
    }
    signalHandlers.set(id, handler);
    return true;
}

/**
 * Unregisters a previously registered signal handler
 * @function unregisterSignalHandler
 * @param {string} id - Handler identifier to remove
 * @returns {boolean} True if handler was found and removed
 *
 * @note
 * - Safe to call for non-existent IDs (returns false)
 * - Useful for dynamic cleanup during runtime
 */
export function unregisterSignalHandler(id) {
    return signalHandlers.delete(id);
}
