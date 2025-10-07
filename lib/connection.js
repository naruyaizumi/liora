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
  if (connection === "connecting") console.log(chalk.yellow.bold("[liora] Initializing... please wait."))
  if (connection === "open") console.log(chalk.green.bold("[liora] Connection established successfully."))
  if (isOnline === false) {
    console.log(chalk.redBright.bold("[liora] Disconnected from WhatsApp network."))
    console.log(chalk.red("Attempting reconnection"))
  }
  if (receivedPendingNotifications) console.log(chalk.cyan("[liora] Awaiting pending notifications."))
  if (connection === "close") {
    console.log(chalk.redBright("[liora] Connection closed unexpectedly."))
    console.log(chalk.gray("Reconnecting session"))
  }

  global.timestamp.connect = new Date()

  if (lastDisconnect?.error) {
    const { statusCode } = lastDisconnect.error.output || {}
    if (statusCode !== DisconnectReason.loggedOut) {
      setTimeout(async () => {
        try {
          await global.reloadHandler(true)
          console.log(chalk.yellow.bold("[liora] Reloading session modules"))
        } catch (err) {
          console.error(chalk.red("[liora] ReloadHandler failed:"), err)
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
        conn.logger.warn(`[liora] Failed to load '${filename}': ${err.message}`)
      }
    }
    conn.logger.info(`[liora] Loaded: ${success}, Failed: ${failed}`)
  }

  await filesInit().catch(console.error)

  global.reload = async (_ev, filename) => {
    if (!pluginFilter(filename)) return
    const dir = global.__filename(join(pluginFolder, filename), true)
    try {
      await access(dir)
      conn.logger.info(`[liora] Detected modification: ${filename}`)
    } catch {
      conn.logger.warn(`[liora] Plugin removed: ${filename}`)
      delete global.plugins[filename]
      return
    }

    try {
      const module = await import(`${global.__filename(dir)}?update=${Date.now()}`)
      global.plugins[filename] = module.default || module
      conn.logger.info(`[liora] Reloaded successfully: ${filename}`)
    } catch (err) {
      conn.logger.error(`[liora] Reload error in '${filename}':\n${format(err)}`)
    } finally {
      global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)))
    }
  }

  Object.freeze(global.reload)

  let pendingReload = false
  let lastChange = 0
  let lastChangedFile = null
  const debounceMs = 1500

  schedule("pluginWatcherDebounce", async () => {
    if (!pendingReload || !lastChangedFile) return
    if (Date.now() - lastChange >= debounceMs) {
      pendingReload = false
      try {
        await global.reload(null, lastChangedFile)
        conn.logger.info(chalk.green(`[liora] Hot-reload: ${lastChangedFile}`))
      } catch (err) {
        conn.logger.error(`[liora] Debounced reload failed: ${err.message}`)
      }
    }
  }, { intervalSeconds: 1 })

  watch(pluginFolder, { recursive: true }, async (_event, filename) => {
    if (!filename || !pluginFilter(filename)) return
    try {
      lastChangedFile = filename
      lastChange = Date.now()
      pendingReload = true
      conn.logger.info(`[liora] File change detected: ${filename}`)
    } catch (err) {
      conn.logger.error(`[liora] Watcher failed for ${filename}: ${err.message}`)
    }
  })

  conn.logger.info(chalk.gray("[liora] Plugin watcher active."))
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