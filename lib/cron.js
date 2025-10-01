import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let cronNative;
try {
    cronNative = require(path.join(__dirname, "../build/Release/cron.node"));
} catch {
    try {
        cronNative = require(path.join(__dirname, "../build/Debug/cron.node"));
    } catch {
        throw new Error("Cron addon belum terbuild.");
    }
}

const jobs = new Map();

class CronJob {
    constructor(name, handle) {
        this._name = name;
        this._handle = handle;
        if (this._handle?.start) {
            this._handle.start();
        }
    }

    stop() {
        if (this._handle?.stop) {
            this._handle.stop();
            this._handle = null;
            jobs.delete(this._name);
        }
    }

    isRunning() {
        return this._handle?.isRunning?.() ?? false;
    }

    secondsToNext() {
        return this._handle?.secondsToNext?.() ?? -1;
    }
}

export function schedule(exprOrName, callback, options = {}) {
    if (typeof callback !== "function") {
        throw new Error("schedule() butuh callback function");
    }
    const handle = cronNative.schedule(exprOrName, callback, options);
    const job = new CronJob(exprOrName, handle);
    jobs.set(exprOrName, job);
    return job;
}
