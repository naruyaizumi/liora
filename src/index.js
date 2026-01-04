import "./config.js";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

const rootDir = process.cwd();

async function ensureDirs() {
    const dbDir = join(rootDir, "src", "database");
    try {
        await mkdir(dbDir, { recursive: true });
    } catch (e) {
        global.logger.error(e.message);
        throw e;
    }
}

await ensureDirs();

let childProcess = null;
let shuttingDown = false;
let crashCount = 0;
let lastCrash = 0;
const MAX_CRASHES = 5;
const CRASH_WINDOW = 60000;
const COOLDOWN_TIME = 10000;
const RESTART_DELAY = 2000;

async function start(file) {
    if (shuttingDown) return 1;

    const scriptPath = join(rootDir, "src", file);
    const args = [scriptPath, ...process.argv.slice(2)];

    return new Promise((resolve) => {
        try {
            childProcess = Bun.spawn({
                cmd: ["bun", ...args],
                cwd: rootDir,
                stdin: "inherit",
                stdout: "inherit",
                stderr: "inherit",
                env: process.env,
                onExit(proc, exitCode, signalCode, error) {
                    if (error) {
                        global.logger.error(error.message);
                    }

                    if (!shuttingDown) {
                        if (exitCode !== 0) {
                            global.logger.warn(
                                `Child process exited with code ${exitCode}${
                                    signalCode ? ` (signal: ${signalCode})` : ""
                                }`
                            );
                        }
                    }
                    childProcess = null;
                    resolve(exitCode || 0);
                },
            });
        } catch (e) {
            global.logger.error(e.message);
            childProcess = null;
            resolve(1);
        }
    });
}

async function stopChild(signal = "SIGTERM") {
    if (shuttingDown) return;
    shuttingDown = true;

    if (!childProcess) {
        return cleanup();
    }

    global.logger.info(`Shutting down gracefully (signal: ${signal})...`);

    const controller = new AbortController();
    const timeout = setTimeout(() => {
        if (childProcess && !childProcess.killed) {
            global.logger.warn("Child process unresponsive after 8s, force killing...");
            try {
                childProcess.kill("SIGKILL");
            } catch (e) {
                global.logger.error(e.message);
            }
        }
        controller.abort();
    }, 8000);

    try {
        childProcess.kill(signal);
        await Promise.race([
            childProcess.exited,
            new Promise((resolve) => setTimeout(resolve, 10000)),
        ]);
        clearTimeout(timeout);
    } catch (e) {
        global.logger.error(e.message);
    } finally {
        clearTimeout(timeout);
    }

    cleanup();
}

function cleanup() {
    setTimeout(() => {
        process.exit(0);
    }, 100);
}

async function supervise() {
    while (true) {
        if (shuttingDown) break;

        const code = await start("main.js");

        if (shuttingDown || code === 0) {
            global.logger.info("Supervisor shutting down");
            break;
        }

        const now = Date.now();
        if (now - lastCrash < CRASH_WINDOW) {
            crashCount++;
        } else {
            crashCount = 1;
        }
        lastCrash = now;

        if (crashCount >= MAX_CRASHES) {
            global.logger.warn(
                `Too many crashes (${crashCount}/${MAX_CRASHES} in ${CRASH_WINDOW / 1000}s). ` +
                    `Cooling down for ${COOLDOWN_TIME / 1000}s...`
            );
            await Bun.sleep(COOLDOWN_TIME);
            crashCount = 0;
        } else {
            global.logger.info(
                `Restarting after crash (${crashCount}/${MAX_CRASHES})... ` +
                    `Waiting ${RESTART_DELAY / 1000}s`
            );
            await Bun.sleep(RESTART_DELAY);
        }
    }
}

process.once("SIGINT", () => {
    stopChild("SIGINT").catch((e) => {
        global.logger.error(e.message);
        process.exit(1);
    });
});

process.once("SIGTERM", () => {
    stopChild("SIGTERM").catch((e) => {
        global.logger.error(e.message);
        process.exit(1);
    });
});

process.on("uncaughtException", (e) => {
    global.logger.error(e.message);
    if (e.stack) global.logger.error(e.stack);
    stopChild("SIGTERM").catch(() => process.exit(1));
});

process.on("unhandledRejection", (e) => {
    global.logger.error(e.message);
    stopChild("SIGTERM").catch(() => process.exit(1));
});

supervise().catch((e) => {
    global.logger.fatal(e.message);
    if (e.stack) global.logger.fatal(e.stack);
    process.exit(1);
});