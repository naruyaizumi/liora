import { join } from "path";
import { mkdir } from "fs/promises";
import { spawn } from "child_process";
import pino from "pino";

const logger = pino({
    level: "info",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

const rootDir = process.cwd();

async function ensureDirs() {
    try {
        await mkdir(join(rootDir, "database"), { recursive: true });
    } catch (e) {
        logger.error({ error: e.message }, "Failed to create directories");
        throw e;
    }
}

await ensureDirs();

let childProcess = null;
let isShuttingDown = false;
let crashCount = 0;
let lastCrash = 0;

const MAX_CRASHES = 5;
const CRASH_WINDOW = 60000;
const COOLDOWN_TIME = 10000;
const RESTART_DELAY = 2000;
const GRACEFUL_SHUTDOWN_TIMEOUT = 10000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function start(file) {
    if (isShuttingDown) return 0;

    const scriptPath = join(rootDir, "src", file);
    const args = [...process.execArgv, scriptPath, ...process.argv.slice(2)];

    return new Promise((resolve) => {
        try {
            childProcess = spawn(process.execPath, args, {
                cwd: rootDir,
                stdio: "inherit",
                env: process.env,
            });

            childProcess.on("exit", (code, signal) => {
                const exitCode = code ?? 0;
                
                if (!isShuttingDown) {
                    if (exitCode !== 0) {
                        logger.warn(
                            { code: exitCode, signal },
                            "Child process exited with error"
                        );
                    } else if (signal) {
                        logger.info({ signal }, "Child process terminated by signal");
                    }
                }
                
                childProcess = null;
                resolve(exitCode);
            });

            childProcess.on("error", (error) => {
                logger.error({ error: error.message }, "Child process error");
                childProcess = null;
                resolve(1);
            });
        } catch (e) {
            logger.error({ error: e.message }, "Failed to spawn child process");
            childProcess = null;
            resolve(1);
        }
    });
}

async function stopChild(reason = "shutdown") {
    if (isShuttingDown) return;
    isShuttingDown = true;

    if (!childProcess) {
        logger.info("No child process to stop");
        return;
    }

    logger.info({ reason }, "Stopping child process gracefully...");

    let exitedGracefully = false;

    // Send SIGTERM for graceful shutdown
    try {
        childProcess.kill("SIGTERM");
    } catch (e) {
        logger.error({ error: e.message }, "Failed to send SIGTERM");
    }

    // Wait for graceful exit
    const gracefulExit = new Promise((resolve) => {
        const onExit = () => {
            exitedGracefully = true;
            resolve();
        };
        
        if (childProcess) {
            childProcess.once("exit", onExit);
        } else {
            resolve();
        }
    });

    const timeout = new Promise((resolve) => 
        setTimeout(resolve, GRACEFUL_SHUTDOWN_TIMEOUT)
    );

    await Promise.race([gracefulExit, timeout]);

    // Force kill if still running
    if (childProcess && !exitedGracefully) {
        logger.warn("Child process did not exit gracefully, sending SIGKILL");
        try {
            childProcess.kill("SIGKILL");
            await sleep(1000);
        } catch (e) {
            logger.error({ error: e.message }, "Failed to send SIGKILL");
        }
    } else {
        logger.info("Child process exited gracefully");
    }

    childProcess = null;
}

async function supervise() {
    while (true) {
        if (isShuttingDown) {
            logger.info("Supervisor exiting");
            break;
        }

        const exitCode = await start("main.js");

        // Clean exit or shutdown
        if (isShuttingDown || exitCode === 0) {
            logger.info("Clean exit, stopping supervisor");
            break;
        }

        // Track crash rate
        const now = Date.now();
        if (now - lastCrash < CRASH_WINDOW) {
            crashCount++;
        } else {
            crashCount = 1;
        }
        lastCrash = now;

        // Too many crashes - cooldown
        if (crashCount >= MAX_CRASHES) {
            logger.warn(
                {
                    crashes: crashCount,
                    window: CRASH_WINDOW / 1000,
                    cooldown: COOLDOWN_TIME / 1000
                },
                "Too many crashes, cooling down..."
            );
            await sleep(COOLDOWN_TIME);
            crashCount = 0;
        } else {
            logger.info(
                {
                    crashes: crashCount,
                    max: MAX_CRASHES,
                    delay: RESTART_DELAY / 1000
                },
                "Restarting after crash..."
            );
            await sleep(RESTART_DELAY);
        }
    }
}

// Graceful shutdown on SIGTERM
process.once("SIGTERM", async () => {
    logger.info("Received SIGTERM");
    await stopChild("SIGTERM");
    process.exit(0);
});

// Graceful shutdown on SIGINT (Ctrl+C)
process.once("SIGINT", async () => {
    logger.info("Received SIGINT");
    await stopChild("SIGINT");
    process.exit(0);
});

// Handle uncaught errors
process.on("uncaughtException", async (e) => {
    logger.error({ error: e.message, stack: e.stack }, "Uncaught exception in supervisor");
    await stopChild("uncaughtException");
    process.exit(1);
});

process.on("unhandledRejection", async (e) => {
    logger.error(
        { error: e?.message, stack: e?.stack },
        "Unhandled rejection in supervisor"
    );
    await stopChild("unhandledRejection");
    process.exit(1);
});

// Start supervising
supervise().catch(async (e) => {
    logger.fatal({ error: e.message, stack: e.stack }, "Fatal supervisor error");
    await stopChild("fatal");
    process.exit(1);
});