import { readdir, readFile, access } from "fs/promises"
import path, { dirname } from "path"
import assert from "assert"
import { fileURLToPath } from "url"
import { createRequire } from "module"
import chalk from "chalk"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const require = createRequire(__dirname)
const pkg = require(path.join(__dirname, "./package.json"))

function timestamp() {
  return chalk.gray(new Date().toISOString().replace("T", " ").split(".")[0])
}

async function collectFiles() {
  const folders = [".", ...(pkg.directories ? Object.values(pkg.directories) : [])]
  const files = []

  for (const folder of folders) {
    try {
      await access(folder)
      const entries = await readdir(folder)
      const jsFiles = entries.filter((v) => v.endsWith(".js"))
      for (const f of jsFiles) files.push(path.resolve(path.join(folder, f)))
    } catch {
      continue
    }
  }

  return files
}

async function checkFiles() {
  console.log(chalk.cyan(`\n[${timestamp()}] [liora] Starting source validation...`))

  const files = await collectFiles()
  let passed = 0
  let failed = 0

  for (const file of files) {
    if (file === __filename) continue
    try {
      const src = await readFile(file, "utf8")
      if (!src.trim()) throw new Error("Empty or invalid file content.")
      assert.ok(file)
      console.log(chalk.green(`[${timestamp()}] [OK] ${file}`))
      passed++
    } catch (err) {
      console.error(chalk.red(`[${timestamp()}] [FAIL] ${file} → ${err.message}`))
      failed++
      process.exitCode = 1
    }
  }

  console.log(chalk.gray("───────────────────────────────────────────"))
  console.log(
    chalk.cyanBright(
      `[${timestamp()}] [liora] Completed — ${chalk.green(`${passed} passed`)}, ${chalk.red(`${failed} failed`)}`
    )
  )

  if (failed === 0) {
    console.log(chalk.greenBright(`[${timestamp()}] [liora] All files validated successfully.`))
  } else {
    console.warn(chalk.yellow(`[${timestamp()}] [liora] Some files failed validation.`))
  }
}

checkFiles().catch((err) => {
  console.error(chalk.red(`[${timestamp()}] [liora] FATAL: ${err.message}`))
  process.exit(1)
})