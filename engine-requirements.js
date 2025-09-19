import { spawn, execSync } from "child_process"
import process from "process"
import chalk from "chalk"
import "./config.js"

function checkCommand(cmd) {
try {
execSync(`${cmd} -version`, { stdio: "ignore" })
return true
} catch {
return false
}
}

const nodeVersion = process.versions.node
const major = parseInt(nodeVersion.split(".")[0])
const nodeOk = major >= 22
const ffmpegOk = checkCommand("ffmpeg")
const convertOk = checkCommand("convert")
const pairingOk = !!global.config?.pairingNumber
console.log(chalk.cyan.bold(`
╭───────────────────────────────╮
│ 🍩 IZUMI BOT ENGINE CHECKER 🍓
│ ──────────────────────────────
│ 🍰 Node.js     : ${nodeOk ? chalk.green("OK v" + nodeVersion) : chalk.red("FAILED (" + nodeVersion + ")")}
│ 🍬 FFmpeg      : ${ffmpegOk ? chalk.green("OK") : chalk.red("FAILED")}
│ 🍪 ImageMagick : ${convertOk ? chalk.green("OK") : chalk.red("FAILED")}
│ 🎀 Pairing Num : ${pairingOk ? chalk.green(global.config.pairingNumber) : chalk.red("FAILED")}
╰───────────────────────────────╯
`))
if (!nodeOk || !ffmpegOk || !convertOk || !pairingOk) {
process.exit(1)
}
const child = spawn("node", ["index.js"], { stdio: "inherit" })
child.on("close", (code) => {
console.log(chalk.yellow(`⚠️ Process exited with code ${code}`))
})