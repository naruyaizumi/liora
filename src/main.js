import "./config.js";
import { serialize } from "#core/message.js";
import { useSQLiteAuthState } from "#auth";
import { Browsers, fetchLatestBaileysVersion } from "baileys";
import { dirname, join } from "node:path";
import { mkdir, access } from "node:fs/promises";
import {
    getAllPlugins,
    loadPlugins,
    EventManager,
    CleanupManager,
    cleanupReconnect,
    reloadAllPlugins,
    reloadSinglePlugin,
} from "#core/connection.js";
import { naruyaizumi } from "#core/socket.js";

const pairNum = global.config.pairingNumber;
const pairCode = global.config.pairingCode;

let auth = null;
let isDown = false;

async function makeDirs() {
    const dbDir = join(process.cwd(), "src", "database");
    try {
        try {
            await access(dbDir);
            global.logger.info("DB dir exists");
        } catch {
            await mkdir(dbDir, { recursive: true });
            global.logger.info(`DB dir made: ${dbDir}`);
        }
    } catch (e) {
        global.logger.error(e.message);
        throw e;
    }
}

await makeDirs();

const logger = () => {
    const LVL = {
        fatal: 60,
        error: 50,
        warn: 40,
        info: 30,
        debug: 20,
        trace: 10,
    };

    const curLvl = LVL[Bun.env.BAILEYS_LOG_LEVEL?.toLowerCase() || "silent"];
    const should = (lvl) => LVL[lvl] >= curLvl;

    const fmt = (val) => {
        if (val === null) return "null";
        if (val === undefined) return "undefined";
        if (val instanceof Error) return val.message || val.toString();
        if (typeof val === "object") {
            return Bun.inspect(val, { colors: false, depth: 2 });
        }
        return String(val);
    };

    const fmtLog = (lvl, ...args) => {
        const time = new Date().toTimeString().slice(0, 5);
        const lvlName = lvl.toUpperCase();
        const fmtArgs = args.map((arg) => fmt(arg));

        let msg = "";
        let obj = null;

        if (args.length > 0 && typeof args[0] === "object" && args[0] !== null) {
            obj = args[0];
            msg = fmtArgs.slice(1).join(" ");
        } else {
            msg = fmtArgs.join(" ");
        }

        if (obj && Object.keys(obj).length > 0) {
            const lines = Object.entries(obj)
                .map(([k, v]) => `    ${k}: ${fmt(v)}`)
                .join("\n");
            return `[${time}] ${lvlName}: ${msg}\n${lines}`;
        }
        return `[${time}] ${lvlName}: ${msg}`;
    };

    return {
        level: "silent",
        fatal: (...args) => {
            if (should("fatal")) console.error(fmtLog("fatal", ...args));
        },
        error: (...args) => {
            if (should("error")) console.error(fmtLog("error", ...args));
        },
        warn: (...args) => {
            if (should("warn")) console.warn(fmtLog("warn", ...args));
        },
        info: (...args) => {
            if (should("info")) console.log(fmtLog("info", ...args));
        },
        debug: (...args) => {
            if (should("debug")) console.debug(fmtLog("debug", ...args));
        },
        trace: (...args) => {
            if (should("trace")) console.trace(fmtLog("trace", ...args));
        },
        child: () => logger(),
    };
};

async function pair(conn) {
    return new Promise((res) => {
        const t = setTimeout(res, 3000);

        const chk = setInterval(() => {
            if (conn.user || conn.ws?.readyState === 1) {
                clearInterval(chk);
                clearTimeout(t);
                res();
            }
        }, 100);
    }).then(async () => {
        try {
            let code = await conn.requestPairingCode(pairNum, pairCode);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            global.logger.info(`Pair code: ${code}`);
        } catch (e) {
            global.logger.error({ error: e.message }, "Pair error");
        }
    });
}

async function LIORA() {
    auth = useSQLiteAuthState();
    const { state, saveCreds } = auth;
    const { version: v } = await fetchLatestBaileysVersion();
    const opt = {
        version: v,
        logger: logger(),
        browser: Browsers.macOS("Safari"),
        auth: state,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        markOnlineOnConnect: true,
        retryRequestDelayMs: 250,
        maxMsgRetryCount: 5,
        appStateMacVerification: {
            patch: true,
            snapshot: true,
        },
        linkPreviewImageThumbnailWidth: 192,
        transactionOpts: {
            maxCommitRetries: 5,
            delayBetweenTriesMs: 2500,
        },
        enableAutoSessionRecreation: true,
        enableRecentMessageCache: true,
    };

    global.conn = naruyaizumi(opt);
    global.conn.isInit = false;

    if (!state.creds.registered && pairNum) {
        await pair(global.conn);
    }

    const evt = new EventManager();
    const cln = new CleanupManager();
    global.cleanupManager = cln;

    const hdl = await import("./handler.js");
    evt.setHandler(hdl);

    global.reloadHandler = await evt.createReloadHandler(opt, saveCreds, cln);

    const file = Bun.fileURLToPath(import.meta.url);
    const src = dirname(file);
    const plugDir = join(src, "./plugins");

    await loadPlugins(plugDir, (dir) => getAllPlugins(dir));

    global.pluginFolder = plugDir;

    global.reloadAllPlugins = async () => {
        return reloadAllPlugins(plugDir);
    };

    global.reloadSinglePlugin = async (fp) => {
        return reloadSinglePlugin(fp, plugDir);
    };

    await global.reloadHandler();
    serialize();
}

async function shutdown(sig) {
    if (isDown) return;
    isDown = true;

    global.logger.info(`Shutdown (${sig})...`);

    try {
        if (!global.__reconnect) {
            global.__reconnect = {
                attempts: 0,
                lastAt: 0,
                cooldownUntil: 0,
                inflight: false,
                timer: null,
                keepAliveTimer: null,
            };
        }

        cleanupReconnect();

        if (global.cleanupManager) {
            try {
                global.cleanupManager.cleanup();
                global.logger.debug("Cleanup done");
            } catch (e) {
                global.logger.warn({ error: e.message }, "Cleanup warn");
            }
        }

        if (auth && typeof auth._dispose === "function") {
            try {
                await Promise.race([
                    auth._dispose(),
                    new Promise((_, rej) =>
                        setTimeout(() => rej(new Error("Dispose timeout")), 5000)
                    ),
                ]);
                auth = null;
                global.logger.debug("Auth disposed");
            } catch (e) {
                global.logger.error({ error: e.message }, "Auth dispose error");
            }
        }

        if (global.sqlite) {
            try {
                global.sqlite.close();
                global.logger.debug("DB closed");
            } catch (e) {
                global.logger.warn({ error: e.message }, "DB close warn");
            }
        }

        global.logger.info("Shutdown ok");
    } catch (e) {
        global.logger.error({ error: e.message, stack: e.stack }, "Shutdown error");
    }
}

process.on("SIGTERM", async () => {
    await shutdown("SIGTERM");
    process.exit(0);
});

process.on("SIGINT", async () => {
    await shutdown("SIGINT");
    process.exit(0);
});

process.on("uncaughtException", async (e) => {
    global.logger.error({ error: e.message, stack: e.stack }, "Uncaught");
    await shutdown("uncaughtException");
    process.exit(1);
});

process.on("unhandledRejection", async (e) => {
    global.logger.error({ error: e?.message, stack: e?.stack }, "Unhandled");
    await shutdown("unhandledRejection");
    process.exit(1);
});

LIORA().catch(async (e) => {
    global.logger.fatal({ error: e.message, stack: e.stack }, "Fatal");
    await shutdown("fatal");
    process.exit(1);
});
