/**
 * @file Configuration and initialization module
 * @module config
 * @description Core configuration manager and utility functions
 * for Liora bot with environment-based configuration.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { db, sqlite } from "./database/database.js";

/**
 * Validates and sanitizes URLs for security
 * @private
 * @function sanitizeUrl
 * @param {string} url - URL to sanitize
 * @param {string} fallback - Fallback URL if validation fails
 * @returns {string} Sanitized URL or fallback
 *
 * @security
 * - Requires HTTPS protocol
 * - Validates URL format
 * - Returns fallback on invalid URLs
 */
const sanitizeUrl = (url, fallback) => {
    try {
        if (!url) return fallback;
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") return fallback;
        return url;
    } catch {
        return fallback;
    }
};

/**
 * Generates a secure pairing code for WhatsApp authentication
 * @private
 * @function generatePairingCode
 * @returns {string} 8-character alphanumeric code
 */
const generatePairingCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

/**
 * Parses boolean values from various formats
 * @private
 * @function parseBoolean
 * @param {*} value - Value to parse
 * @param {boolean} defaultValue - Default value if parsing fails
 * @returns {boolean} Parsed boolean value
 */
const parseBoolean = (value, defaultValue) => {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        const lower = value.toLowerCase();
        if (lower === "true") return true;
        if (lower === "false") return false;
    }
    return defaultValue;
};

/**
 * Initializes the logging system with configurable levels and formats
 * @private
 * @function initializeLogger
 * @returns {Object} Logger instance with methods for all log levels
 *
 * @features
 * - Environment-controlled log levels (LOG_LEVEL)
 * - Pretty printing vs JSON output (LOG_PRETTY)
 * - Structured logging with object support
 * - Colored terminal output (when pretty=true)
 * - Child logger creation with context bindings
 */
const initializeLogger = () => {
    if (globalThis.logger) return globalThis.logger;

    const logLevel = (Bun.env.LOG_LEVEL || "info").toLowerCase();
    const usePretty = parseBoolean(Bun.env.LOG_PRETTY, true);

    /**
     * Log level numeric values (Syslog compatible)
     * @private
     * @constant {Object}
     */
    const LEVEL_NUMBERS = {
        fatal: 60,
        error: 50,
        warn: 40,
        info: 30,
        debug: 20,
        trace: 10,
    };

    /**
     * ANSI color codes for terminal output
     * @private
     * @constant {Object}
     */
    const COLORS = {
        reset: "\x1b[0m",
        bright: "\x1b[1m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        cyan: "\x1b[36m",
        gray: "\x1b[90m",
        magenta: "\x1b[35m",
    };

    /**
     * Color mapping for log levels
     * @private
     * @constant {Object}
     */
    const LEVEL_COLORS = {
        fatal: `${COLORS.bright}${COLORS.red}`,
        error: COLORS.red,
        warn: COLORS.yellow,
        info: COLORS.green,
        debug: COLORS.cyan,
        trace: COLORS.gray,
    };

    /**
     * Display names for log levels
     * @private
     * @constant {Object}
     */
    const LEVEL_NAMES = {
        fatal: "FATAL",
        error: "ERROR",
        warn: "WARN",
        info: "INFO",
        debug: "DEBUG",
        trace: "TRACE",
    };

    // Determine current log level threshold
    const currentLevelNumber =
        logLevel === "silent" ? 100 : LEVEL_NUMBERS[logLevel] || LEVEL_NUMBERS.info;

    /**
     * Formats current time for log prefix
     * @private
     * @function formatTime
     * @returns {string} Formatted time string
     */
    const formatTime = () => {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
    };

    /**
     * Formats object for pretty printing
     * @private
     * @function formatObject
     * @param {Object} obj - Object to format
     * @param {string} indent - Indentation string
     * @returns {string} Formatted object string
     */
    const formatObject = (obj, indent = "    ") => {
        const lines = [];
        for (const [key, value] of Object.entries(obj)) {
            let formattedValue = value;

            if (value === null) formattedValue = "null";
            else if (value === undefined) formattedValue = "undefined";
            else if (typeof value === "object") {
                formattedValue = Bun.inspect(value, { colors: false, depth: 1 });
            } else if (typeof value === "boolean") {
                formattedValue = value ? "true" : "false";
            } else if (typeof value === "number") {
                formattedValue = value.toString();
            }

            lines.push(`${indent}${COLORS.magenta}${key}${COLORS.reset} : ${formattedValue}`);
        }
        return lines.join("\n");
    };

    /**
     * Formats log message in pretty (human-readable) style
     * @private
     * @function formatPretty
     * @param {string} level - Log level
     * @param {Array} args - Log arguments
     * @returns {string} Formatted log string
     */
    const formatPretty = (level, args) => {
        const timeStr = `${COLORS.gray}[${formatTime()}]${COLORS.reset}`;
        const levelColor = LEVEL_COLORS[level] || COLORS.reset;
        const levelName = LEVEL_NAMES[level] || level.toUpperCase();

        let message = "";
        let objectLines = "";

        const strings = [];
        let object = null;

        // Separate string arguments from object arguments
        for (const arg of args) {
            if (typeof arg === "object" && arg !== null && !(arg instanceof Error)) {
                object = arg;
            } else {
                strings.push(String(arg));
            }
        }

        message = strings.join(" ");

        // Add object details if present
        if (object) {
            objectLines = "\n" + formatObject(object);
        }

        return `${timeStr} ${levelColor}${levelName}${COLORS.reset}: ${message}${objectLines}`;
    };

    /**
     * Formats log message in JSON style
     * @private
     * @function formatJson
     * @param {string} level - Log level
     * @param {Array} args - Log arguments
     * @returns {string} JSON-formatted log string
     */
    const formatJson = (level, args) => {
        let message = "";
        const extraFields = [];

        // Process arguments
        for (const arg of args) {
            if (typeof arg === "object" && arg !== null && !(arg instanceof Error)) {
                for (const [key, value] of Object.entries(arg)) {
                    extraFields.push(
                        `"${key}":${typeof value === "string" ? `"${value}"` : value}`
                    );
                }
            } else {
                message += String(arg) + " ";
            }
        }

        const fields = [
            `"level":${LEVEL_NUMBERS[level]}`,
            `"time":${Date.now()}`,
            `"msg":"${message.trim()}"`,
            `"pid":${process.pid}`,
            ...extraFields,
        ];

        return `{${fields.join(",")}}`;
    };

    /**
     * Core logging function with level filtering
     * @private
     * @function log
     * @param {string} level - Log level
     * @param {...*} args - Arguments to log
     */
    const log = (level, ...args) => {
        const levelNumber = LEVEL_NUMBERS[level];
        if (levelNumber === undefined || levelNumber < currentLevelNumber) return;
        if (logLevel === "silent") return;

        const logMessage = usePretty ? formatPretty(level, args) : formatJson(level, args);
        console.log(logMessage);
    };

    /**
     * Logger instance with all log level methods
     * @type {Object}
     */
    const logger = {
        fatal: (...args) => log("fatal", ...args),
        error: (...args) => log("error", ...args),
        warn: (...args) => log("warn", ...args),
        info: (...args) => log("info", ...args),
        debug: (...args) => log("debug", ...args),
        trace: (...args) => log("trace", ...args),

        /**
         * Creates a child logger with context bindings
         * @method child
         * @param {Object} bindings - Context bindings for all log messages
         * @returns {Object} Child logger instance
         */
        child: (bindings) => {
            const childLogger = {
                fatal: (...args) => log("fatal", bindings, ...args),
                error: (...args) => log("error", bindings, ...args),
                warn: (...args) => log("warn", bindings, ...args),
                info: (...args) => log("info", bindings, ...args),
                debug: (...args) => log("debug", bindings, ...args),
                trace: (...args) => log("trace", bindings, ...args),
                child: (additionalBindings) => logger.child({ ...bindings, ...additionalBindings }),
                level: logLevel,
                isLevelEnabled: (level) => {
                    const levelKey = level.toLowerCase();
                    const levelNum = LEVEL_NUMBERS[levelKey];
                    return levelNum !== undefined && levelNum >= currentLevelNumber;
                },
            };

            return childLogger;
        },

        /**
         * Checks if a log level is enabled
         * @method isLevelEnabled
         * @param {string} level - Log level to check
         * @returns {boolean} True if level is enabled
         */
        isLevelEnabled: (level) => {
            const levelKey = level.toLowerCase();
            const levelNum = LEVEL_NUMBERS[levelKey];
            return levelNum !== undefined && levelNum >= currentLevelNumber;
        },

        level: logLevel,
    };

    globalThis.logger = logger;
    return logger;
};

// Initialize global logger
const logger = initializeLogger();

/**
 * Initializes bot configuration from environment variables
 * @private
 * @function initializeConfig
 * @returns {Object} Configuration object
 *
 * @configurationSources
 * 1. Environment variables (primary)
 * 2. Default values (fallback)
 * 3. Auto-generation (pairing codes)
 */
const initializeConfig = () => {
    const ownersEnv = (Bun.env.OWNERS || "").trim();
    let owners = [];

    // Parse owners from environment
    if (ownersEnv) {
        if (ownersEnv.includes(",")) {
            // Comma-separated format
            owners = ownersEnv
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean);
        } else if (ownersEnv.startsWith("[")) {
            // JSON array format
            try {
                const parsed = JSON.parse(ownersEnv);
                if (Array.isArray(parsed)) {
                    owners = parsed.filter((o) => typeof o === "string" && o.trim());
                }
            } catch {
                logger.warn("Invalid OWNERS format, use comma-separated values");
            }
        } else {
            // Single owner format
            owners = [ownersEnv];
        }
    }

    /**
     * Bot configuration object
     * @type {Object}
     */
    const config = {
        owner: owners,
        pairingNumber: (Bun.env.PAIRING_NUMBER || "").trim(),
        pairingCode: (Bun.env.PAIRING_CODE || "").trim().toUpperCase() || generatePairingCode(),
        watermark: Bun.env.WATERMARK || "Liora",
        author: Bun.env.AUTHOR || "Naruya Izumi",
        stickpack: Bun.env.STICKPACK || "Liora",
        stickauth: Bun.env.STICKAUTH || "© Naruya Izumi",
        thumbnailUrl: sanitizeUrl(Bun.env.THUMBNAIL_URL),
    };

    // Validate pairing code format
    if (config.pairingCode.length !== 8 || !/^[A-Z0-9]{8}$/.test(config.pairingCode)) {
        logger.warn("Invalid PAIRING_CODE format, generating new one");
        config.pairingCode = generatePairingCode();
    }

    return config;
};

// Set global configuration
global.config = initializeConfig();

/**
 * Global database references
 * @global
 * @property {DataWrapper} db - Database wrapper instance
 * @property {Database} sqlite - Raw SQLite database instance
 */
global.db = db;
global.sqlite = sqlite;

/**
 * Global timestamp tracking
 * @global
 * @property {Object} timestamp - Startup timestamp
 */
global.timestamp = { start: new Date() };

/**
 * Sends reaction indicators to show loading/processing state
 * @global
 * @async
 * @function loading
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {boolean} back - Whether to remove reaction (done processing)
 * @returns {Promise<void>}
 */
global.loading = async (m, sock, back = false) => {
    if (!sock || !m || !m.chat || !m.key) return;

    try {
        if (back) {
            // Remove reaction (processing finished)
            await sock.sendMessage(m.chat, {
                react: {
                    text: '',
                    key: m.key
                }
            });
        } else {
            // Add loading reaction (processing started)
            await sock.sendMessage(m.chat, {
                react: {
                    text: '🍥',
                    key: m.key
                }
            });
        }
    } catch (e) {
        global.logger?.error({ error: e.message }, "Loading reaction error");
    }
};

/**
 * Failure message configurations for different error types
 * @private
 * @constant {Object}
 */
const FAILURE_MESSAGES = {
    owner: {
        title: "[ACCESS DENIED]",
        body: "This command is restricted to the system owner only.\nContact the administrator for permission.",
    },
    group: {
        title: "[ACCESS DENIED]",
        body: "This command can only be executed within a group context.",
    },
    admin: {
        title: "[ACCESS DENIED]",
        body: "You must be a group administrator to perform this action.",
    },
    botAdmin: {
        title: "[ACCESS DENIED]",
        body: "System privileges insufficient.\nGrant admin access to the bot to continue.",
    },
    restrict: {
        title: "[ACCESS BLOCKED]",
        body: "This feature is currently restricted or disabled by configuration.",
    },
};

/**
 * Global failure handler for permission errors
 * @global
 * @async
 * @function dfail
 * @param {string} type - Failure type (owner, group, admin, botAdmin, restrict)
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @returns {Promise<void>}
 */
global.dfail = async (type, m, sock) => {
    if (!type || !m || !sock || !m.chat) return;

    const failureConfig = FAILURE_MESSAGES[type];
    if (!failureConfig) return;

    const messageText = `\`\`\`\n${failureConfig.title}\n${failureConfig.body}\n\`\`\``;

    try {
        // Send with rich preview if thumbnail available
        await sock.sendMessage(
            m.chat,
            {
                text: messageText,
                contextInfo: {
                    externalAdReply: {
                        title: "ACCESS CONTROL SYSTEM",
                        body: global.config.watermark,
                        mediaType: 1,
                        thumbnailUrl: global.config.thumbnailUrl,
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    } catch {
        // Fallback to simple message
        await sock.sendMessage(m.chat, { text: messageText }, { quoted: m });
    }
};