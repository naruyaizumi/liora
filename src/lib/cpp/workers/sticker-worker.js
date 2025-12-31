/* global self */
import path from "path";

const __filename = Bun.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let stickerAddon = null;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

function loadAddon() {
    if (stickerAddon) return stickerAddon;

    const projectRoot = path.resolve(__dirname, "../../..");
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

    throw new Error("sticker.node not found in Bun worker thread");
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

self.onmessage = async (event) => {
    try {
        const result = await processTask(event.data);

        consecutiveErrors = 0;

        self.postMessage({
            data: result,
            error: null,
        });
    } catch (error) {
        consecutiveErrors++;

        self.postMessage({
            data: null,
            error: error.message,
        });

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.error(
                `[StickerWorker] Too many consecutive errors (${consecutiveErrors}), exiting...`
            );
            self.close();
        }
    }
};

self.onerror = (error) => {
    console.error("[StickerWorker] Uncaught error:", error);
    self.postMessage({
        data: null,
        error: `Uncaught error: ${error.message || error}`,
    });
    self.close();
};

self.onunhandledrejection = (event) => {
    console.error("[StickerWorker] Unhandled rejection:", event.reason);
    self.postMessage({
        data: null,
        error: `Unhandled rejection: ${event.reason}`,
    });
    self.close();
};
