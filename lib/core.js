import chalk from "chalk"
import fs from "fs/promises"
import path from "path"
import "../config.js"

const pkgPath = path.resolve("package.json")
const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"))

export async function engineCheck() {
  const nodeVersion = process.versions.node
  const author = pkg.author?.name || "Unknown"
  const pairing = global.config?.pairingNumber ? "Detected" : "Not Set"
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
• Pairing   : ${pairing}
────────────────────────────────────────────
`)
  )

  if (!global.config?.pairingNumber) {
    console.log(
      chalk.redBright(`[${time}] [liora] Pairing number not configured.`)
    )
    console.log(chalk.gray("────────────────────────────────────────────"))
    console.log(chalk.redBright("[liora] System startup aborted.\n"))
    process.exit(1)
  } else {
    console.log(
      chalk.green(`[${time}] [liora] Configuration verified. System ready.`)
    )
  }
}