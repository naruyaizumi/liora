import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = "naruyaizumi/liora-lib";
const outDir = path.join(__dirname, "./build/Release");
const MAX_DOWNLOAD_SIZE = 100 * 1024 * 1024;
const isBun = typeof Bun !== "undefined";
function getArch() {
    const archMap = {
        x64: "x64",
    };
    const archKey = process.arch;
    if (archMap.hasOwnProperty(archKey)) {
        return archKey;
    }
    throw new Error(
        `Unsupported architecture: ${process.arch}. Only x64 is supported for prebuilds.`
    );
}
function detectDebian() {
    try {
        if (!fs.existsSync("/etc/os-release")) return false;
        const info = fs.readFileSync("/etc/os-release", "utf8");
        return /debian/i.test(info);
    } catch {
        return false;
    }
}
async function latestTag() {
    const userAgent = isBun ? "bun" : "node";
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { "User-Agent": userAgent, Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    const json = await res.json();
    if (typeof json !== "object" || json === null || !("tag_name" in json)) {
        throw new Error("Invalid API response");
    }
    const tagName = json.tag_name;
    if (typeof tagName !== "string") throw new Error("Release tag not found");
    return tagName;
}
async function downloadFile(url, dest, retries = 3) {
    let lastError;
    const userAgent = isBun ? "bun" : "node";
    for (let i = 1; i <= retries; i++) {
        try {
            const res = await fetch(url, { headers: { "User-Agent": userAgent } });
            if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
            const contentLengthHeader = res.headers.get("content-length");
            if (contentLengthHeader) {
                const contentLength = parseInt(contentLengthHeader, 10);
                if (contentLength > MAX_DOWNLOAD_SIZE) {
                    throw new Error(`File too large: ${contentLength} bytes`);
                }
            }
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            if (buffer.length === 0) throw new Error("File is empty");
            if (buffer.length > MAX_DOWNLOAD_SIZE) throw new Error("File exceeds size limit");
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, buffer);
            return buffer.length;
        } catch (err) {
            lastError = err;
            if (i < retries) {
                const message = err instanceof Error ? err.message : String(err);
                console.log(`Retry ${i}/${retries} after error: ${message}`);
                await new Promise((r) => setTimeout(r, i * 1000));
            }
        }
    }
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Download failed after ${retries} attempts: ${errorMessage}`);
}
async function extractArchive(archivePath, destination) {
    if (!fs.existsSync(archivePath)) throw new Error("Archive not found");
    const stats = fs.statSync(archivePath);
    if (stats.size === 0) throw new Error("Archive is empty");
    fs.mkdirSync(destination, { recursive: true });
    try {
        if (isBun) {
            const proc = Bun.spawn(["tar", "-xzf", archivePath, "-C", destination], {
                stdout: "inherit",
                stderr: "inherit",
            });
            await proc.exited;
            if (proc.exitCode !== 0) {
                throw new Error(`tar command failed with exit code ${proc.exitCode}`);
            }
        } else {
            const { execSync } = await import("child_process");
            execSync(`tar -xzf "${archivePath}" -C "${destination}"`, { stdio: "inherit" });
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Extraction failed: ${message}`);
    }
    const extractedFiles = fs.readdirSync(destination);
    if (!extractedFiles.length) throw new Error("No files found after extraction");
    console.log(`Extracted ${extractedFiles.length} file(s): ${extractedFiles.join(", ")}`);
    const hasValidFile = extractedFiles.some((file) => {
        const filePath = path.join(destination, file);
        try {
            const stat = fs.statSync(filePath);
            return stat.isFile() && stat.size > 0;
        } catch {
            return false;
        }
    });
    if (!hasValidFile) {
        throw new Error("No valid files found after extraction");
    }
}
async function manualBuild() {
    console.log("Attempting manual build...");
    try {
        if (isBun) {
            const proc = Bun.spawn(["bun", "run", "build:addon"], {
                stdout: "inherit",
                stderr: "inherit",
                stdin: "inherit",
            });
            await proc.exited;
            if (proc.exitCode !== 0) {
                throw new Error(`Build command exited with code ${proc.exitCode}`);
            }
        } else {
            const { execSync } = await import("child_process");
            execSync("npm run build:addon", { stdio: "inherit" });
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Manual build command failed: ${message}`);
    }
}
function cleanup(tmpDir) {
    if (!tmpDir) return;
    try {
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
            console.log("Cleanup completed.");
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Cleanup warning: ${message}`);
    }
}
(async () => {
    console.log(`Running on: ${isBun ? "Bun" : "Node.js"} ${process.version}`);
    let tmp;
    try {
        if (os.platform() !== "linux") {
            throw new Error("Prebuilds are only available for Linux");
        }
        const arch = getArch();
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), "liora-prebuild-"));
        console.log("Fetching latest release...");
        const tag = await latestTag();
        console.log(`Latest tag: ${tag}`);
        const isDebian = detectDebian();
        const fileName = isDebian
            ? `build-linux-${arch}-debian12.tar.gz`
            : `build-linux-${arch}.tar.gz`;
        const url = `https://github.com/${repo}/releases/download/${tag}/${fileName}`;
        const dest = path.join(tmp, fileName);
        console.log(`Detected: ${isDebian ? "Debian 12" : "Generic Linux"} (${arch})`);
        console.log("Downloading official release build...");
        console.log(`URL: ${url}`);
        const size = await downloadFile(url, dest);
        console.log(`Downloaded ${(size / 1024 / 1024).toFixed(2)} MB`);
        fs.mkdirSync(outDir, { recursive: true });
        console.log("Extracting archive...");
        await extractArchive(dest, outDir);
        console.log("✓ Prebuild installed successfully.");
        cleanup(tmp);
        process.exit(0);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`✗ Prebuild failed: ${message}`);
        cleanup(tmp);
        try {
            await manualBuild();
            console.log("✓ Manual build completed successfully.");
            process.exit(0);
        } catch (fallbackErr) {
            const fallbackMsg =
                fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
            console.error(`✗ Fallback build failed: ${fallbackMsg}`);
            console.error("Please ensure you have the required build tools installed.");
            process.exit(1);
        }
    }
})();
