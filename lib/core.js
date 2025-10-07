import { execSync } from "child_process"
import process from "process"
import chalk from "chalk"
import fs from "fs/promises"
import path from "path"
import "../config.js"

const pkgPath = path.resolve("package.json")
const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"))

function checkCommand(cmd) {
  const flags = ["--version", "-version", "-v"]
  for (const flag of flags) {
    try {
      execSync(`${cmd} ${flag}`, { stdio: "ignore" })
      return true
    } catch {/* ignore */}
  }
  return false
}

function checkLib(name, header) {
  try {
    execSync(`pkg-config --exists ${name}`, { stdio: "ignore" })
    return true
  } catch {
    try {
      execSync(`echo "#include <${header}>" | g++ -E -xc++ - > /dev/null`, {
        stdio: "ignore"
      })
      return true
    } catch {
      return false
    }
  }
}

export async function engineCheck() {
  const nodeVersion = process.versions.node
  const major = parseInt(nodeVersion.split(".")[0])
  const requiredNode = pkg.engines?.node || ">=22.0.0"
  const author = pkg.author?.name || "Unknown"

  const checks = {
    "node.js": major >= parseInt(requiredNode.match(/\d+/)?.[0] || 22),
    "ffmpeg": checkCommand("ffmpeg"),
    "git": checkCommand("git"),
    "unzip": checkCommand("unzip"),
    "zip": checkCommand("zip"),
    "g++": checkCommand("g++"),
    "make": checkCommand("make"),
    "python3": checkCommand("python3"),
    "libavformat-dev": checkLib("libavformat", "libavformat/avformat.h"),
    "libavcodec-dev": checkLib("libavcodec", "libavcodec/avcodec.h"),
    "libavutil-dev": checkLib("libavutil", "libavutil/avutil.h"),
    "libswscale-dev": checkLib("libswscale", "libswscale/swscale.h"),
    "libswresample-dev": checkLib("libswresample", "libswresample/swresample.h"),
    "libwebp-dev": checkLib("libwebp", "webp/decode.h"),
    "pairing number": !!global.config?.pairingNumber
  }

  const fails = Object.keys(checks).filter(k => !checks[k])
  const total = Object.keys(checks).length
  const ok = total - fails.length
  const time = new Date().toISOString().replace("T", " ").split(".")[0]

  console.log(
    chalk.gray(`
────────────────────────────────────────────
[${chalk.cyan("liora")}] Engine Report
────────────────────────────────────────────
• Project   : ${pkg.name}
• Version   : ${pkg.version}
• Type      : ${pkg.type}
• License   : ${pkg.license}
• Author    : ${author}
────────────────────────────────────────────
• Node.js   : ${nodeVersion}
• Status    : ${ok}/${total} checks passed
────────────────────────────────────────────
`)
  )

  if (fails.length > 0) {
    console.log(
      chalk.redBright(`[${time}] [liora] Missing dependencies:`)
    )
    for (const f of fails) console.log(chalk.red(`  └─ ${f}`))
    console.log(chalk.gray("────────────────────────────────────────────"))
    console.log(chalk.redBright("[liora] System startup aborted.\n"))
    process.exit(1)
  } else {
    console.log(
      chalk.green(`[${time}] [liora] All dependencies verified.`)
    )
    console.log(chalk.greenBright("[liora] System ready.\n"))
  }
}