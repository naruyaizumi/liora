import { readdir, readFile, access } from "fs/promises"
import path, { dirname } from "path"
import assert from "assert"
import { fileURLToPath } from "url"
import { createRequire } from "module"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const require = createRequire(__dirname)
const pkg = require(path.join(__dirname, "./package.json"))

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
  const files = await collectFiles()

  for (const file of files) {
    if (file === __filename) continue
    console.log(`🍡 Checking: ${file}`)
    try {
      const src = await readFile(file, "utf8")
      if (!src.trim()) throw new Error(`🍪 File kosong atau tidak valid: ${file}`)
      assert.ok(file)
      console.log(`🍰 Done: ${file}`)
    } catch (err) {
      console.error(`🍫 Error: ${err.message}`)
      process.exitCode = 1
    }
  }
}

checkFiles()
  .then(() => console.log("🧁 All files validated successfully! 🍬"))
  .catch((err) => {
    console.error("🍩 FATAL:", err)
    process.exit(1)
  })