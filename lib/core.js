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
    } catch {}
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
    "🍰 Node.js Compatible": major >= parseInt(requiredNode.match(/\d+/)?.[0] || 22),
    "🍮 ffmpeg": checkCommand("ffmpeg"),
    "🍧 git": checkCommand("git"),
    "🍡 unzip": checkCommand("unzip"),
    "🍬 zip": checkCommand("zip"),
    "🍪 g++": checkCommand("g++"),
    "🍫 make": checkCommand("make"),
    "🍭 python3": checkCommand("python3"),
    "🍯 libavformat-dev": checkLib("libavformat", "libavformat/avformat.h"),
    "🍩 libavcodec-dev": checkLib("libavcodec", "libavcodec/avcodec.h"),
    "🍨 libavutil-dev": checkLib("libavutil", "libavutil/avutil.h"),
    "🧁 libswscale-dev": checkLib("libswscale", "libswscale/swscale.h"),
    "🍈 libswresample-dev": checkLib("libswresample", "libswresample/swresample.h"),
    "🍋 libwebp-dev": checkLib("libwebp", "webp/decode.h"),
    "🍙 Pairing Number": !!global.config?.pairingNumber
  }

  const fails = Object.keys(checks).filter(k => !checks[k])
  const total = Object.keys(checks).length
  const ok = total - fails.length

  console.log(
    chalk.cyan.bold(`
╭───────────────────────────────╮
│ 🍓 LIORA ENGINE CHECKER 🍰
│ ──────────────────────────────
│ 🧩 Project : ${chalk.white(pkg.name)}
│ 🍬 Version : ${chalk.white(pkg.version)}
│ 🧁 Type    : ${chalk.white(pkg.type)}
│ 🍭 License : ${chalk.white(pkg.license)}
│ 🍰 Author  : ${chalk.white(author)}
│ ──────────────────────────────
│ ⚙️  Node.js : ${chalk.white(nodeVersion)}
│ 🍡 OK     : ${ok}/${total}
│ 🍪 Failed : ${fails.length}
╰───────────────────────────────╯
`)
  )

  if (fails.length > 0) {
    console.log(chalk.red.bold("🍰 Beberapa dependensi belum terpenuhi:"))
    fails.forEach(f => console.log("   - " + chalk.redBright(f)))
    console.log()
    process.exit(1)
  } else {
    console.log(chalk.green.bold("🍬 Semua dependensi terpenuhi, siap jalan! ✨"))
  }
}