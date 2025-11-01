import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { createInterface } from "readline";
import { mkdir } from "fs/promises";
import pino from "pino";

const logger = pino({
    level: "debug",
    base: { module: "PROCESS MANAGER" },
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const rl = createInterface({ input: process.stdin, output: process.stdout });

async function ensureDirs() {
    const dir = join(__dirname, "database");
    try {
        await mkdir(dir, { recursive: true });
    } catch (e) {
        logger.error(e.message);
        throw e;
    }
}

await ensureDirs();

let childProcess = null;
let shuttingDown = false;
let crashCount = 0;
let lastCrash = 0;

async function start(file) {
    const args = [join(__dirname, file), ...process.argv.slice(2)];
    
    return new Promise((resolve) => {
        childProcess = spawn(process.argv[0], args, {
            stdio: ["inherit", "inherit", "inherit", "ipc"],
        });
        
        childProcess.on("message", (msg) => {
            if (msg === "uptime") {
                childProcess.send(process.uptime());
            }
        });
        
        childProcess.on("exit", (code, signal) => {
            const exitInfo = code !== null ? code : signal;
            if (code !== 0 && !shuttingDown) {
                logger.warn(
                    `Child process exited (${exitInfo})`
                    );
            }
            childProcess = null;
            resolve(code);
        });
        
        childProcess.on("error", (e) => {
            logger.error(e.message);
            if (childProcess) {
                childProcess.kill("SIGTERM");
                childProcess = null;
            }
            resolve(1);
        });
        
        if (!rl.listenerCount("line")) {
            rl.on("line", (line) => {
                if (childProcess?.connected) {
                    childProcess.send(line.trim());
                }
            });
        }
    });
}

async function stopChild(signal = "SIGINT") {
    if (shuttingDown) return;
    shuttingDown = true;
    if (!childProcess) {
        cleanup();
        return;
    }
    logger.info(`Shutting down (${signal})`);
    const timeout = setTimeout(() => {
        if (childProcess) {
            logger.warn(`Force killing unresponsive process`);
            childProcess.kill("SIGKILL");
        }
    }, 5000);
    
    childProcess.kill(signal);
    
    await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (!childProcess) {
                clearInterval(checkInterval);
                clearTimeout(timeout);
                resolve();
            }
        }, 100);
        
        setTimeout(() => {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve();
        }, 7000);
    });
    
    cleanup();
}

function cleanup() {
    logger.info("Shutdown complete");
    rl.close();
    process.exit(0);
}

async function supervise() {
    while (true) {
        const code = await start("main.js");
        
        if (shuttingDown) {
            break;
        }
        if (code === 0) {
            break;
        }
        const now = Date.now();
        if (now - lastCrash < 60000) {
            crashCount++;
        } else {
            crashCount = 1;
        }
        lastCrash = now;
        
        if (crashCount >= 5) {
            logger.warn(
                `Too many crashes (${crashCount}). Cooling down for 1 minute...`
                );
            await new Promise((r) => setTimeout(r, 60000));
            crashCount = 0;
        } else {
            logger.info(
                `Restarting in 2 seconds... (crash count: ${crashCount})`
                );
            await new Promise((r) => setTimeout(r, 2000));
        }
    }
}

process.on("SIGINT", () => {
    stopChild("SIGINT").catch((e) => {
        logger.error(e.message);
        process.exit(1);
    });
});

process.on("SIGTERM", () => {
    stopChild("SIGTERM").catch((e) => {
        logger.error(e.message);
        process.exit(1);
    });
});

process.on("uncaughtException", (e) => {
    logger.error(e.message);
    logger.error(e.stack);
    stopChild("SIGTERM").catch(() => {
        process.exit(1);
    });
});

process.on("unhandledRejection", (reason, promise) => {
    logger.error(`Unhandled rejection at ${promise}: ${reason}`);
    stopChild("SIGTERM").catch(() => {
        process.exit(1);
    });
});

supervise().catch((e) => {
    logger.fatal(e.message);
    logger.fatal(e.stack);
    process.exit(1);
});