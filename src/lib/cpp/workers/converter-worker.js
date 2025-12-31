/* global self */
import path from "path";

const __filename = Bun.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let converterAddon = null;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

function loadAddon() {
    if (converterAddon) return converterAddon;

    const searchPaths = [
        path.join(process.cwd(), "build", "Release", "converter.node"),
        path.join(process.cwd(), "build", "Debug", "converter.node"),
    ];

    for (const addonPath of searchPaths) {
        try {
            converterAddon = require(addonPath);
            consecutiveErrors = 0;
            return converterAddon;
        } catch {
            continue;
        }
    }

    throw new Error("converter.node not found in Bun worker thread");
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

    return addon.convert(buffer, options);
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
                `[ConverterWorker] Too many consecutive errors (${consecutiveErrors}), exiting...`
            );
            self.close();
        }
    }
};

self.onerror = (error) => {
    console.error("[ConverterWorker] Uncaught error:", error);
    self.postMessage({
        data: null,
        error: `Uncaught error: ${error.message || error}`,
    });
    self.close();
};

self.onunhandledrejection = (event) => {
    console.error("[ConverterWorker] Unhandled rejection:", event.reason);
    self.postMessage({
        data: null,
        error: `Unhandled rejection: ${event.reason}`,
    });
    self.close();
};
