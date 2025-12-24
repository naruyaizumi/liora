import path from "path";
import { fileURLToPath } from "url";
import { parentPort } from "worker_threads";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let stickerAddon = null;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

function loadAddon() {
    if (stickerAddon) return stickerAddon;

    const projectRoot = path.resolve(__dirname, "../../../..");
    const searchPaths = [
        path.join(projectRoot, "build", "Release", "sticker.node"),
        path.join(projectRoot, "build", "Debug", "sticker.node"),
    ];

    for (const addonPath of searchPaths) {
        try {
            stickerAddon = require(addonPath);
            consecutiveErrors = 0;
            return stickerAddon;
        } catch {
            continue;
        }
    }

    throw new Error("sticker.node not found in Node.js worker thread");
}

async function processTask(data) {
    const { buffer, options } = data;

    if (!Buffer.isBuffer(buffer)) {
        throw new Error("Invalid input: buffer must be a Buffer");
    }

    if (buffer.length === 0) {
        throw new Error("Invalid input: empty buffer");
    }

    if (buffer.length > 100 * 1024 * 1024) {
        throw new Error("Input too large (max 100MB)");
    }

    const addon = loadAddon();

    return addon.sticker(buffer, options);
}

if (parentPort) {
    parentPort.on("message", async (data) => {
        try {
            const result = await processTask(data);

            consecutiveErrors = 0;

            parentPort.postMessage({
                data: result,
                error: null,
            });
        } catch (error) {
            consecutiveErrors++;

            parentPort.postMessage({
                data: null,
                error: error.message,
            });

            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.error(
                    `[StickerWorker] Too many consecutive errors (${consecutiveErrors}), exiting...`
                );
                process.exit(1);
            }
        }
    });

    parentPort.on("error", (error) => {
        console.error("[StickerWorker] Parent port error:", error);
        process.exit(1);
    });

    process.on("uncaughtException", (error) => {
        console.error("[StickerWorker] Uncaught exception:", error);
        if (parentPort) {
            parentPort.postMessage({
                data: null,
                error: `Uncaught exception: ${error.message}`,
            });
        }
        process.exit(1);
    });

    process.on("unhandledRejection", (reason) => {
        console.error("[StickerWorker] Unhandled rejection:", reason);
        if (parentPort) {
            parentPort.postMessage({
                data: null,
                error: `Unhandled rejection: ${reason}`,
            });
        }
        process.exit(1);
    });
}
