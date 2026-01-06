import "./config.js";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";

const rootDir = process.cwd();

async function ensureDirs() {
  const dbDir = join(rootDir, "src", "database");
  try {
    await mkdir(dbDir, { recursive: true });
  } catch (e) {
    global.logger.error(e.message);
    throw e;
  }
}

await ensureDirs();

let childProcess = null;
let shuttingDown = false;
let crashCount = 0;
let lastCrash = 0;
const MAX_CRASHES = 5;
const CRASH_WINDOW = 60000;
const MIN_UPTIME = 5000;

const backoff = (attempt) => {
  const delays = [1000, 2000, 5000, 10000, 30000];
  return delays[Math.min(attempt - 1, delays.length - 1)];
};

async function start(file) {
  if (shuttingDown) return 1;

  const scriptPath = join(rootDir, "src", file);
  const args = [scriptPath, ...process.argv.slice(2)];
  const startTime = Date.now();

  return new Promise((resolve) => {
    try {
      childProcess = Bun.spawn({
        cmd: ["bun", ...args],
        cwd: rootDir,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
        env: process.env,
        onExit(proc, exitCode, signalCode, error) {
          const uptime = Date.now() - startTime;

          if (error) {
            global.logger.error(error.message);
          }

          if (!shuttingDown) {
            if (exitCode !== 0) {
              global.logger.warn(
                `Child exited with code ${exitCode}${signalCode ? ` (signal: ${signalCode})` : ""} after ${Math.floor(uptime / 1000)}s`,
              );
            }

            if (uptime < MIN_UPTIME) {
              global.logger.warn(
                `Process crashed too quickly (${Math.floor(uptime / 1000)}s < ${MIN_UPTIME / 1000}s)`,
              );
            }
          }

          childProcess = null;
          resolve(exitCode || 0);
        },
      });
    } catch (e) {
      global.logger.error(e.message);
      childProcess = null;
      resolve(1);
    }
  });
}

async function stopChild(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;

  if (!childProcess) {
    return cleanup();
  }

  global.logger.info(`Shutting down gracefully (signal: ${signal})...`);

  const timeout = setTimeout(() => {
    if (childProcess && !childProcess.killed) {
      global.logger.warn("Child unresponsive after 8s, force killing...");
      try {
        childProcess.kill("SIGKILL");
      } catch (e) {
        global.logger.error(e.message);
      }
    }
  }, 8000);

  try {
    childProcess.kill(signal);
    await Promise.race([
      childProcess.exited,
      new Promise((resolve) => setTimeout(resolve, 10000)),
    ]);
    clearTimeout(timeout);
  } catch (e) {
    global.logger.error(e.message);
  } finally {
    clearTimeout(timeout);
  }

  cleanup();
}

function cleanup() {
  setTimeout(() => {
    process.exit(0);
  }, 100);
}

async function supervise() {
  while (true) {
    if (shuttingDown) break;

    const code = await start("main.js");

    if (shuttingDown || code === 0) {
      global.logger.info("Supervisor shutting down cleanly");
      break;
    }

    const now = Date.now();
    if (now - lastCrash < CRASH_WINDOW) {
      crashCount++;
    } else {
      crashCount = 1;
    }
    lastCrash = now;

    if (crashCount >= MAX_CRASHES) {
      const cooldown = 5 * 60 * 1000;
      global.logger.error(
        `Too many crashes (${crashCount}/${MAX_CRASHES} in ${CRASH_WINDOW / 1000}s). Cooling down for ${cooldown / 1000}s...`,
      );
      await Bun.sleep(cooldown);
      crashCount = 0;
      continue;
    }

    const delay = backoff(crashCount);
    global.logger.info(
      `Restarting after crash (${crashCount}/${MAX_CRASHES})... Waiting ${delay / 1000}s`,
    );
    await Bun.sleep(delay);
  }
}

process.once("SIGINT", () => {
  stopChild("SIGINT").catch((e) => {
    global.logger.error(e.message);
    process.exit(1);
  });
});

process.once("SIGTERM", () => {
  stopChild("SIGTERM").catch((e) => {
    global.logger.error(e.message);
    process.exit(1);
  });
});

process.on("uncaughtException", (e) => {
  global.logger.error(e.message);
  if (e.stack) global.logger.error(e.stack);
  stopChild("SIGTERM").catch(() => process.exit(1));
});

process.on("unhandledRejection", (e) => {
  global.logger.error(e?.message || "Unknown rejection");
  stopChild("SIGTERM").catch(() => process.exit(1));
});

supervise().catch((e) => {
  global.logger.fatal(e.message);
  if (e.stack) global.logger.fatal(e.stack);
  process.exit(1);
});
