import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { spawn } from "child_process"
import { createInterface } from "readline"
import { readFile } from "fs/promises"
import { engineCheck } from "./lib/core.js"
import chalk from "chalk"

const __dirname = dirname(fileURLToPath(import.meta.url))
const rl = createInterface({ input: process.stdin, output: process.stdout })

const pkgPath = join(__dirname, "./package.json")
const pkgData = await readFile(pkgPath, "utf8").catch((err) => {
  console.error(chalk.redBright("🍪 [FATAL] Gagal membaca package.json:"), err)
  process.exit(1)
})
const { name } = JSON.parse(pkgData)

await engineCheck()

let childProcess = null
let shuttingDown = false
let crashCount = 0
let lastCrash = 0

async function start(file) {
  const args = [join(__dirname, file), ...process.argv.slice(2)]
  const tag = chalk.cyanBright(`[${name}]`)

  return new Promise((resolve) => {
    childProcess = spawn(process.argv[0], args, {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    })

    childProcess.on("message", (msg) => {
      if (msg === "uptime") childProcess.send(process.uptime())
    })

    childProcess.on("exit", (code, signal) => {
      console.log(chalk.magentaBright(`🍰 ${tag} exited (code: ${code}, signal: ${signal})`))
      childProcess = null
      resolve(code)
    })

    childProcess.on("error", (err) => {
      console.error(chalk.redBright(`🍪 ${tag} child process error:`), err)
      childProcess?.kill("SIGTERM")
      resolve(1)
    })

    if (!rl.listenerCount("line")) {
      rl.on("line", (line) => {
        if (childProcess?.connected) childProcess.send(line.trim())
      })
    }
  })
}

async function stopChild(signal = "SIGINT") {
  if (shuttingDown || !childProcess) return
  shuttingDown = true

  const tag = chalk.cyanBright(`[${name}]`)
  console.log(chalk.yellowBright(`\n🍩 ${tag} Received ${signal}, shutting down gracefully...`))
  childProcess.kill(signal)

  const timeout = setTimeout(() => {
    console.warn(chalk.redBright(`🍫 ${tag} Child did not exit in time, forcing kill...`))
    childProcess.kill("SIGKILL")
  }, 10000)

  await new Promise((r) => {
    childProcess.once("exit", () => {
      clearTimeout(timeout)
      r()
    })
  })

  console.log(chalk.greenBright(`🍰 ${tag} Graceful shutdown complete.`))
  process.exit(0)
}

async function supervise() {
  const tag = chalk.cyanBright(`[${name}]`)
  while (true) {
    const exitCode = await start("main.js")

    if (shuttingDown || exitCode === 0) {
      console.log(chalk.greenBright(`🍰 ${tag} stopped normally.`))
      break
    }

    const now = Date.now()
    if (now - lastCrash < 60000) crashCount++
    else crashCount = 1
    lastCrash = now

    if (crashCount >= 5) {
      console.warn(chalk.redBright(`🍪 ${tag} too many crashes in a short time — pausing for 5 minutes.`))
      await new Promise((r) => setTimeout(r, 300000))
      crashCount = 0
    } else {
      console.warn(chalk.yellowBright(`🍪 ${tag} restarting in 3s...`))
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
}

process.on("SIGINT", () => stopChild("SIGINT"))
process.on("SIGTERM", () => stopChild("SIGTERM"))
process.on("uncaughtException", (err) => {
  console.error(chalk.redBright(`🍫 [${name}] Uncaught exception:`), err)
  stopChild("SIGTERM")
})

supervise().catch((err) => {
  console.error(chalk.redBright("🍪 [FATAL] Supervisor error:"), err)
  process.exit(1)
})