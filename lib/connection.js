/* global conn */
import path, { join } from "path"
import { access } from "fs/promises"
import { watch } from "fs"
import { format } from "util"
import { schedule } from "../src/bridge.js"
import chalk from "chalk"
import { DisconnectReason } from "baileys"
import { checkGempa, clearTmp } from "./schedule.js"

async function connectionUpdateHandler(update) {
  const { receivedPendingNotifications, connection, lastDisconnect, isOnline, isNewLogin } = update

  if (isNewLogin) conn.isInit = true
  if (connection === "connecting") console.log(chalk.yellow.bold("🚀 Activating, please wait a moment"))
  if (connection === "open") console.log(chalk.cyan.bold("⚡ Connected! Successfully activated."))
  if (isOnline === false) {
    console.log(chalk.redBright.bold("🔴 Status: Disconnected!"))
    console.log(chalk.red.bold("❌ Connection to WhatsApp has been lost."))
    console.log(chalk.red.bold("🚀 Trying to reconnect"))
  }
  if (receivedPendingNotifications) console.log(chalk.cyan.bold("📩 Status: Waiting for new messages"))
  if (connection === "close") {
    console.log(chalk.redBright.bold("⚠️ Connection Closed!"))
    console.log(chalk.red.bold("📡 Attempting to reconnect"))
  }

  global.timestamp.connect = new Date()

  if (lastDisconnect?.error) {
    const { statusCode } = lastDisconnect.error.output || {}
    if (statusCode !== DisconnectReason.loggedOut) {
      setTimeout(async () => {
        try {
          await global.reloadHandler(true)
          console.log(chalk.redBright.bold("🔌 Reconnecting..."))
        } catch (err) {
          console.error(chalk.red("❌ ReloadHandler failed:"), err)
        }
      }, 1000)
    }
  }
}

async function initReload(conn, pluginFolder, getAllPlugins) {
  const pluginFilter = (filename) => /\.js$/.test(filename)
  global.plugins = {}

  async function filesInit() {
    let success = 0, failed = 0
    const pluginFiles = await Promise.resolve(getAllPlugins(pluginFolder))
    if (!Array.isArray(pluginFiles))
      throw new TypeError("getAllPlugins must return an iterable array")

    for (const filepath of pluginFiles) {
      const filename = path.relative(pluginFolder, filepath)
      try {
        const file = global.__filename(filepath)
        const module = await import(file)
        global.plugins[filename] = module.default || module
        success++
      } catch (err) {
        delete global.plugins[filename]
        failed++
        conn.logger.warn(`🍪 Failed to load plugin '${filename}': ${err.message}`)
      }
    }
    conn.logger.info(`🍩 Total plugins loaded: ${success}, failed: ${failed}`)
  }

  await filesInit().catch(console.error)

  global.reload = async (_ev, filename) => {
    if (!pluginFilter(filename)) return
    const dir = global.__filename(join(pluginFolder, filename), true)
    try {
      await access(dir)
      conn.logger.info(`🍰 Reloading plugin '${filename}'`)
    } catch {
      conn.logger.warn(`🍪 Plugin '${filename}' has been removed`)
      delete global.plugins[filename]
      return
    }

    try {
      const module = await import(`${global.__filename(dir)}?update=${Date.now()}`)
      global.plugins[filename] = module.default || module
      conn.logger.info(`🧁 Plugin '${filename}' reloaded successfully`)
    } catch (err) {
      conn.logger.error(`🍪 Error reloading plugin '${filename}'\n${format(err)}`)
    } finally {
      global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)))
    }
  }

  Object.freeze(global.reload)

  let pendingReload = false
  let lastChange = 0
  const debounceMs = 1000

  schedule("pluginWatcherDebounce", async () => {
    if (pendingReload && Date.now() - lastChange >= debounceMs) {
      pendingReload = false
      try {
        await filesInit()
        conn.logger.info(chalk.greenBright.bold("🧁 Debounced reload executed"))
      } catch {/* ignore */}
    }
  }, { intervalSeconds: 1 })

  watch(pluginFolder, { recursive: true }, async (event, filename) => {
    if (!filename || !pluginFilter(filename)) return
    try {
      lastChange = Date.now()
      pendingReload = true
      conn.logger.info(`🍩 Detected plugin change: ${filename}`)
    } catch (err) {
      conn.logger.error(`Reload watcher failed for ${filename}: ${err.message}`)
    }
  })

  conn.logger.info(chalk.cyan.bold("🧁 Watcher aktif memantau perubahan"))
}

function initCron() {
  schedule("reset", async () => {
    await clearTmp()
  }, { cron: "0 0 * * *" })

  schedule("feeds", async () => {
    await checkGempa()
  }, { intervalSeconds: 15 })
}

export { connectionUpdateHandler, initReload, initCron }