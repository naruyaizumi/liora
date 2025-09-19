import { execSync, exec } from "child_process"
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
const ffmpegOk = checkCommand("ffmpeg", "FFmpeg")
const convertOk = checkCommand("convert", "ImageMagick")
const pairingOk = !!global.config?.pairingNumber
console.log(chalk.cyan.bold(`
╭────────────────────────────────╮
│ 🍩 IZUMI BOT ENGINE CHECKER 🍓
│ ───────────────────────────────
│ 🍰 Node.js     : ${nodeOk ? "OK v" + nodeVersion : "FAILED (" + nodeVersion + ")"}
│ 🍬 FFmpeg      : ${ffmpegOk ? "OK" : "FAILED"}
│ 🍪 ImageMagick : ${convertOk ? "OK" : "FAILED"}
│ 🎀 Pairing Num : ${pairingOk ? global.config.pairingNumber : "FAILED"}
╰────────────────────────────────╯
`))
if (!nodeOk || !ffmpegOk || !convertOk || !pairingOk) {
process.exit(1)
}
exec("node index.js", (err, stdout, stderr) => {
if (err) console.error(`Error: ${stderr}`)
else console.log(stdout)
})