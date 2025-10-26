import { readdir, readFile, access } from "fs/promises";
import path, { dirname } from "path";
import assert from "assert";
import { fileURLToPath } from "url";
import { createRequire } from "module";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(__dirname);
const pkg = require(path.join(__dirname, "./package.json"));

async function collectFiles() {
    const folders = [".", ...(pkg.directories ? Object.values(pkg.directories) : [])];
    const files = [];

    for (const folder of folders) {
        try {
            await access(folder);
            const entries = await readdir(folder);
            const jsFiles = entries.filter((v) => v.endsWith(".js"));
            for (const f of jsFiles) files.push(path.resolve(path.join(folder, f)));
        } catch {
            continue;
        }
    }

    return files;
}

async function checkFiles() {
    logger.info("Starting source validation...");

    const files = await collectFiles();
    let passed = 0;
    let failed = 0;

    for (const file of files) {
        if (file === __filename) continue;
        try {
            const src = await readFile(file, "utf8");
            if (!src.trim()) throw new Error("Empty or invalid file content.");
            assert.ok(file);
            logger.info(`[OK] ${file}`);
            passed++;
        } catch (e) {
            logger.error(`[FAIL] ${file} → ${e.message}`);
            failed++;
            process.exitCode = 1;
        }
    }

    logger.info("───────────────────────────────────────────");
    logger.info(`Completed — ${passed} passed, ${failed} failed`);

    if (failed === 0) {
        logger.info("All files validated successfully.");
    } else {
        logger.warn("Some files failed validation.");
    }
}

checkFiles().catch((e) => {
    logger.fatal(e.message);
    process.exit(1);
});
