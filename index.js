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
  console.error(chalk.redBright(`[liora.supervisor] [FATAL] Failed to read package.json: ${err.message}`))
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
  const tag = chalk.cyan(`[${name}]`)

  return new Promise((resolve) => {
    childProcess = spawn(process.argv[0], args, {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    })

    const time = () => new Date().toISOString().replace("T", " ").split(".")[0]

    childProcess.on("message", (msg) => {
      if (msg === "uptime") childProcess.send(process.uptime())
    })

    childProcess.on("exit", (code, signal) => {
      console.log(chalk.magenta(`[${time()}] ${tag} process exited (code=${code}, signal=${signal})`))
      childProcess = null
      resolve(code)
    })

    childProcess.on("error", (err) => {
      console.error(chalk.red(`[${time()}] ${tag} process error: ${err.message}`))
      childProcess?.kill("SIGTERM")
      resolve(1)
    })

    if (!rl.listenerCount("line")) {
      rl.on("line", (line) => {
        if (childProcess?.connected) childProcess.send(line.trim())
      })
    }

    console.log(chalk.greenBright(`[${time()}] ${tag} child process started.`))
  })
}

async function stopChild(signal = "SIGINT") {
  if (shuttingDown || !childProcess) return
  shuttingDown = true

  const tag = chalk.cyan(`[${name}]`)
  const time = () => new Date().toISOString().replace("T", " ").split(".")[0]

  console.log(chalk.yellow(`[${time()}] ${tag} received ${signal}, shutting down gracefully...`))
  childProcess.kill(signal)

  const timeout = setTimeout(() => {
    console.warn(chalk.red(`[${time()}] ${tag} force killing unresponsive process...`))
    childProcess.kill("SIGKILL")
  }, 10000)

  await new Promise((r) => {
    childProcess.once("exit", () => {
      clearTimeout(timeout)
      r()
    })
  })

  console.log(chalk.green(`[${time()}] ${tag} graceful shutdown complete.`))
  process.exit(0)
}

async function supervise() {
  const tag = chalk.cyan(`[${name}]`)
  const time = () => new Date().toISOString().replace("T", " ").split(".")[0]

  while (true) {
    const exitCode = await start("main.js")

    if (shuttingDown || exitCode === 0) {
      console.log(chalk.green(`[${time()}] ${tag} stopped normally.`))
      break
    }

    const now = Date.now()
    if (now - lastCrash < 60000) crashCount++
    else crashCount = 1
    lastCrash = now

    if (crashCount >= 5) {
      console.warn(chalk.red(`[${time()}] ${tag} too many crashes — pausing for 5 minutes.`))
      await new Promise((r) => setTimeout(r, 300000))
      crashCount = 0
    } else {
      console.warn(chalk.yellow(`[${time()}] ${tag} restarting in 3 seconds...`))
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
}

process.on("SIGINT", () => stopChild("SIGINT"))
process.on("SIGTERM", () => stopChild("SIGTERM"))
process.on("uncaughtException", (err) => {
  const time = new Date().toISOString().replace("T", " ").split(".")[0]
  console.error(chalk.red(`[${time}] [${name}] Uncaught Exception: ${err.message}`))
  stopChild("SIGTERM")
})

supervise().catch((err) => {
  const time = new Date().toISOString().replace("T", " ").split(".")[0]
  console.error(chalk.red(`[${time}] [liora] FATAL: ${err.message}`))
  process.exit(1)
})