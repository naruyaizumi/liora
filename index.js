import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { createInterface } from "readline";
import yargs from "yargs";
import fs from "fs";
import "dotenv/config";
import { engineCheck } from "./lib/core.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rl = createInterface({ input: process.stdin, output: process.stdout });
const pkgPath = join(__dirname, "./package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const { name } = pkg;
await engineCheck();
let childProcess = null;
async function start(file) {
    const args = [join(__dirname, file), ...process.argv.slice(2)];
    childProcess = spawn(process.argv[0], args, {
        stdio: ["inherit", "inherit", "inherit", "ipc"],
    });
    childProcess.on("message", (msg) => {
        if (msg === "uptime") childProcess.send(process.uptime());
    });
    childProcess.on("exit", (code) => {
        console.log(`[${name}] exited with code ${code}`);
        childProcess = null;
    });
    const opts = yargs(process.argv.slice(2)).exitProcess(false).parse();
    if (!opts.test && !rl.listenerCount("line")) {
        rl.on("line", (line) => {
            if (childProcess) childProcess.send(line.trim());
        });
    }
}

start("main.js");
