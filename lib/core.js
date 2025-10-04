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

function checkLib(name, header) {
    try {
        execSync(`pkg-config --exists ${name}`, { stdio: "ignore" });
        return true;
    } catch {
        try {
            execSync(`echo "#include <${header}>" | g++ -E -xc++ - > /dev/null`, { stdio: "ignore" });
            return true;
        } catch {
            return false;
        }
    }
}

function detectPackageManager() {
    if (fs.existsSync("yarn.lock")) return "yarn";
    if (fs.existsSync("package-lock.json")) return "npm";
    if (fs.existsSync("pnpm-lock.yaml")) return "pnpm";
    return "npm";
}

function installDeps() {
    const pm = detectPackageManager();
    console.log(chalk.yellow.bold(`🍰 Install dependencies dengan ${pm}...`));
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
            console.log(chalk.green.bold("🍪 Native addon sudah ada → skip build"));
            return;
        }
        console.log(chalk.cyan.bold("🍵 Build native addon cron..."));
        execSync("node-gyp configure build", { stdio: "inherit" });
        console.log(chalk.green.bold("🍡 Native addon berhasil dibuild"));
    } catch (e) {
        console.error(chalk.red.bold("🍅 Gagal build native addon:"), e.message);
        process.exit(1);
    }
}

async function checkUpdate() {
    const res = await fetch(`https://raw.githubusercontent.com/${repo}/main/package.json`);
    const remotePkg = await res.json();
    if (remotePkg.version !== pkg.version) {
        console.log(
            chalk.yellow.bold(`🍓 Versi lokal: ${pkg.version} → Versi terbaru: ${remotePkg.version}`)
        );
        console.log(chalk.magenta.bold("🍰 Ada update baru! Mohon tunggu sebentar ya, lagi proses~"));
        return true;
    } else {
        console.log(chalk.green.bold("🍩 Script sudah versi terbaru, aman ✨"));
        return false;
    }
}

async function doUpdate() {
    console.log(chalk.cyan.bold("📥 Mengunduh update dari GitHub..."));
    execSync("rm -rf tmp && mkdir -p tmp", { stdio: "inherit" });
    execSync(`curl -L https://github.com/${repo}/archive/refs/heads/main.zip -o tmp/update.zip`, {
        stdio: "inherit",
    });
    execSync("unzip -q tmp/update.zip -d tmp", { stdio: "inherit" });
    console.log(chalk.green.bold("🍧 Update terunduh"));

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

    installDeps();
}

export async function engineCheck() {
    const nodeVersion = process.versions.node;
    const major = parseInt(nodeVersion.split(".")[0]);

    const checks = {
        "Node.js >= 22"     : major >= 22,
        "ffmpeg"            : checkCommand("ffmpeg"),
        "git"               : checkCommand("git"),
        "unzip"             : checkCommand("unzip"),
        "zip"               : checkCommand("zip"),
        "g++"               : checkCommand("g++"),
        "make"              : checkCommand("make"),
        "python3"           : checkCommand("python3"),
        "libavformat-dev"   : checkLib("libavformat", "libavformat/avformat.h"),
        "libavcodec-dev"    : checkLib("libavcodec", "libavcodec/avcodec.h"),
        "libavutil-dev"     : checkLib("libavutil", "libavutil/avutil.h"),
        "libswscale-dev"    : checkLib("libswscale", "libswscale/swscale.h"),
        "libswresample-dev" : checkLib("libswresample", "libswresample/swresample.h"),
        "libwebp-dev"       : checkLib("libwebp", "webp/decode.h"),
        "Pairing Number"    : !!global.config?.pairingNumber
    };

    const fails = Object.keys(checks).filter(k => !checks[k]);
    const total = Object.keys(checks).length;
    const ok = total - fails.length;

    console.log(chalk.cyan.bold(`
╭───────────────────────────────╮
│ 🍓 LIORA ENGINE CHECKER 🍰
│ ──────────────────────────────
│  Version: ${chalk.blue(pkg.version)}
╰───────────────────────────────╯
`));

    if (fails.length === 0) {
        console.log(chalk.green.bold(`🍃 All dependencies OK (${ok}/${total})`));
    } else {
        console.error(chalk.red.bold(`🍂 ${fails.length} dependencies missing (${ok}/${total} OK):`));
        fails.forEach(f => console.error("   - " + chalk.red(f)));
        console.log();
        process.exit(1);
    }

    buildAddon();

    if (global.config?.DEVELOPER) {
        console.log(chalk.yellow.bold("🛠️ Developer mode aktif → auto-update dilewati"));
        return;
    }

    let needUpdate = await checkUpdate();
    if (needUpdate) await doUpdate();
}