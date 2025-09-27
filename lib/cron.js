import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let cronNative;
try {
  cronNative = require(path.join(__dirname, "../build/Release/cron.node"));
} catch (e) {
  try {
    cronNative = require(path.join(__dirname, "../build/Debug/cron.node"));
  } catch (err) {
    throw new Error("❌ Cron addon belum terbuild. Jalankan: npm run build:addon");
  }
}

class CronJob {
  constructor(handle) {
    this._handle = handle;
  }

  stop() {
    if (this._handle?.stop) {
      this._handle.stop();
      this._handle = null;
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
  return new CronJob(handle);
}