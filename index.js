import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { createInterface } from "readline";
import { readFile, mkdir } from "fs/promises";
import chalk from "chalk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rl = createInterface({ input: process.stdin, output: process.stdout });

const pkgPath = join(__dirname, "./package.json");
const pkgData = await readFile(pkgPath, "utf8").catch((err) => {
    console.error(chalk.redBright(`[supervisor] FATAL: cannot read package.json (${err.message})`));
    process.exit(1);
});
const { name } = JSON.parse(pkgData);

async function ensureDirs() {
    const dir = join(__dirname, "database");
    try {
        await mkdir(dir, { recursive: true });
    } catch (err) {
        console.warn(chalk.yellow(`Cannot create folder "${dir}": ${err.message}`));
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

        const time = () => new Date().toISOString().split("T")[1].split(".")[0];

        childProcess.on("message", (msg) => {
            if (msg === "uptime") childProcess.send(process.uptime());
        });

        childProcess.on("exit", (code, signal) => {
            if (code !== 0 && !shuttingDown)
                console.warn(chalk.yellow(`[${time()}] ${name}: exited (${code || signal})`));
            resolve(code);
        });

        childProcess.on("error", (err) => {
            console.error(chalk.red(`[${time()}] ${name}: process error (${err.message})`));
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

    const time = () => new Date().toISOString().split("T")[1].split(".")[0];
    console.log(chalk.gray(`[${time()}] ${name}: shutting down (${signal})`));
    childProcess.kill(signal);

    const timeout = setTimeout(() => {
        console.warn(chalk.red(`[${time()}] ${name}: force kill unresponsive process`));
        childProcess.kill("SIGKILL");
    }, 10000);

    await new Promise((r) => {
        childProcess.once("exit", () => {
            clearTimeout(timeout);
            r();
        });
    });

    console.log(chalk.green(`[${time()}] ${name}: shutdown complete`));
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
            console.warn(chalk.red(`Too many crashes. Cooling down 5 min...`));
            await new Promise((r) => setTimeout(r, 300000));
            crashCount = 0;
        } else {
            await new Promise((r) => setTimeout(r, 2000));
        }
    }
}

process.on("SIGINT", () => stopChild("SIGINT"));
process.on("SIGTERM", () => stopChild("SIGTERM"));
process.on("uncaughtException", (err) => {
    console.error(chalk.red(`[supervisor] Uncaught Exception: ${err.message}`));
    stopChild("SIGTERM");
});

supervise().catch((err) => {
    console.error(chalk.red(`[supervisor] FATAL: ${err.message}`));
    process.exit(1);
});
