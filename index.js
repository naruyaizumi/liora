import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { createInterface } from "readline";
import { mkdir } from "fs/promises";
import pino from "pino";

const logger = pino({
    level: "debug",
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
            if (msg === "uptime") childProcess.send(process.uptime());
        });

        childProcess.on("exit", (code, signal) => {
            if (code !== 0 && !shuttingDown)
                logger.warn(`Child process exited (${code || signal})`);
            resolve(code);
        });

        childProcess.on("error", (e) => {
            logger.error(e.message);
            childProcess?.kill("SIGTERM");
            resolve(1);
        });

        if (!rl.listenerCount("line")) {
            rl.on("line", (line) => {
                if (childProcess?.connected) childProcess.send(line.trim());
            });
        }
    });
}

async function stopChild(signal = "SIGINT") {
    if (shuttingDown || !childProcess) return;
    shuttingDown = true;
    logger.info(`Shutting down (${signal})`);
    childProcess.kill(signal);
    const timeout = setTimeout(() => {
        logger.warn(`Force killing unresponsive process`);
        childProcess.kill("SIGKILL");
    }, 10000);

    await new Promise((r) => {
        childProcess.once("exit", () => {
            clearTimeout(timeout);
            r();
        });
    });

    logger.info(`Shutdown complete`);
    process.exit(0);
}

async function supervise() {
    while (true) {
        const code = await start("main.js");

        if (shuttingDown || code === 0) break;

        const now = Date.now();
        if (now - lastCrash < 60000) crashCount++;
        else crashCount = 1;
        lastCrash = now;

        if (crashCount >= 5) {
            logger.warn(`Too many crashes (${crashCount}). Cooling down for 1 minute...`);
            await new Promise((r) => setTimeout(r, 60000));
            crashCount = 0;
        } else {
            await new Promise((r) => setTimeout(r, 2000));
        }
    }
}

process.on("SIGINT", () => stopChild("SIGINT"));
process.on("SIGTERM", () => stopChild("SIGTERM"));
process.on("uncaughtException", (e) => {
    logger.error(e.message);
    stopChild("SIGTERM");
});

supervise().catch((e) => {
    logger.fatal(e.message);
    process.exit(1);
});
