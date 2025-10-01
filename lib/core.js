import { execSync, execFileSync } from "child_process";
import process from "process";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import "../config.js";

const repo = "naruyaizumi/liora";
const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));

function checkCommand(cmd) {
    const candidates = ["--version", "-version", "-v"];
    for (const arg of candidates) {
        try {
            execSync(`${cmd} ${arg}`, { stdio: "ignore" });
            return true;
        } catch {
            // ignore
        }
    }
    return false;
}

function detectPackageManager() {
    if (fs.existsSync("yarn.lock")) return "yarn";
    if (fs.existsSync("package-lock.json")) return "npm";
    if (fs.existsSync("pnpm-lock.yaml")) return "pnpm";
    return "npm";
}

function installDeps() {
    const pm = detectPackageManager();
    console.log(chalk.yellow(`🍰 Install dependencies dengan ${pm}...`));
    if (pm === "yarn") {
        execSync("yarn install --frozen-lockfile", { stdio: "inherit" });
    } else if (pm === "pnpm") {
        execSync("pnpm install --frozen-lockfile", { stdio: "inherit" });
    } else {
        execSync("npm install --no-audit --no-fund", { stdio: "inherit" });
    }
}

function buildAddon() {
    try {
        const addonPath = path.resolve("./build/Release/cron.node");
        if (fs.existsSync(addonPath)) {
            console.log(chalk.green("🍪 Native addon sudah ada → skip build"));
            return;
        }
        console.log(chalk.cyan("🍵 Build native addon cron..."));
        execSync("node-gyp configure build", { stdio: "inherit" });
        console.log(chalk.green("🍡 Native addon berhasil dibuild"));
    } catch (e) {
        console.error(chalk.red("🍅 Gagal build native addon:"), e.message);
        process.exit(1);
    }
}

async function checkUpdate() {
    const res = await fetch(`https://raw.githubusercontent.com/${repo}/main/package.json`);
    const remotePkg = await res.json();
    if (remotePkg.version !== pkg.version) {
        console.log(
            chalk.yellow(`🍓 Versi lokal: ${pkg.version} → Versi terbaru: ${remotePkg.version}`)
        );
        console.log(chalk.magenta("🍰 Ada update baru! Mohon tunggu sebentar ya, lagi proses~"));
        return true;
    } else {
        console.log(chalk.green("🍩 Script sudah versi terbaru, aman ✨"));
        return false;
    }
}

async function doUpdate() {
    console.log(chalk.cyan("📥 Mengunduh update dari GitHub..."));
    execSync("rm -rf tmp && mkdir -p tmp", { stdio: "inherit" });
    execSync(`curl -L https://github.com/${repo}/archive/refs/heads/main.zip -o tmp/update.zip`, {
        stdio: "inherit",
    });
    execSync("unzip -q tmp/update.zip -d tmp", { stdio: "inherit" });
    console.log(chalk.green("🍧 Update terunduh"));

    const dirs = fs.readdirSync("tmp");
    const extracted = dirs.find((d) => d.toLowerCase().startsWith("liora-"));
    if (!extracted) throw new Error("Extracted folder not found");

    const skip = ["config.js", ".env", "database.db", "auth"];
    const rsyncArgs = [
        "-av",
        "--progress",
        `tmp/${extracted}/`,
        "./",
        ...skip.map((s) => ["--exclude", s]).flat(),
    ];
    execFileSync("rsync", rsyncArgs, { stdio: "inherit" });
    execSync("rm -rf tmp node_modules", { stdio: "inherit" });

    if (!fs.existsSync(".env") && fs.existsSync(".env.example")) {
        fs.copyFileSync(".env.example", ".env");
        console.log(chalk.green("📦 .env otomatis dibuat dari .env.example"));
    }

    installDeps();
}

export async function engineCheck() {
    const nodeVersion = process.versions.node;
    const major = parseInt(nodeVersion.split(".")[0]);

    const nodeOk = major >= 22;
    const ffmpegOk = checkCommand("ffmpeg");
    const convertOk = checkCommand("convert");
    const gitOk = checkCommand("git");
    const unzipOk = checkCommand("unzip");
    const zipOk = checkCommand("zip");
    const gppOk = checkCommand("g++");
    const makeOk = checkCommand("make");
    const pyOk = checkCommand("python3");

    const pairingOk = !!global.config?.pairingNumber;

    console.log(
        chalk.cyan.bold(`
╭───────────────────────────────╮
│ 🍓 LIORA ENGINE CHECKER 🍰
│ ──────────────────────────────
│ 🍩 Version     : ${chalk.blue(pkg.version)}
│ 🍰 Node.js     : ${nodeOk ? chalk.green("OK v" + nodeVersion) : chalk.red("FAILED (" + nodeVersion + ")")}
│ 🍬 FFmpeg      : ${ffmpegOk ? chalk.green("OK") : chalk.red("FAILED")}
│ 🍪 ImageMagick : ${convertOk ? chalk.green("OK") : chalk.red("FAILED")}
│ 🥂 Git         : ${gitOk ? chalk.green("OK") : chalk.red("FAILED")}
│ 📦 Unzip & Zip : ${unzipOk && zipOk ? chalk.green("OK") : !unzipOk && !zipOk ? chalk.red("FAILED") : unzipOk ? chalk.yellow("Unzip OK, Zip MISSING") : chalk.yellow("Zip OK, Unzip MISSING")}
│ 🥟 g++         : ${gppOk ? chalk.green("OK") : chalk.red("FAILED")}
│ 🥯 make        : ${makeOk ? chalk.green("OK") : chalk.red("FAILED")}
│ 🍱 Python3     : ${pyOk ? chalk.green("OK") : chalk.red("FAILED")}
│ 🎀 Pairing Num : ${pairingOk ? chalk.yellow(global.config.pairingNumber) : chalk.red("FAILED")}
╰───────────────────────────────╯
      © 2024 Naruya Izumi
`)
    );

    if (
        !nodeOk ||
        !ffmpegOk ||
        !convertOk ||
        !gitOk ||
        !unzipOk ||
        !unzipOk ||
        !gppOk ||
        !makeOk ||
        !pyOk ||
        !pairingOk
    ) {
        console.error(chalk.red("❌ Syarat wajib belum terpenuhi, bot tidak bisa jalan"));
        process.exit(1);
    }

    buildAddon();

    if (global.config?.DEVELOPER) {
        console.log(chalk.yellow("🛠️ Developer mode aktif → auto-update dilewati"));
        return;
    }

    let needUpdate = await checkUpdate();
    if (needUpdate) await doUpdate();
}
