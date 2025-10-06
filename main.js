/* global conn */
process.on("uncaughtException", console.error)
process.on("unhandledRejection", console.error)

import "./config.js"
import "./global.js"
import { naruyaizumi, protoType, serialize } from "./lib/simple.js"
import { schedule } from "./src/bridge.js"
import {
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  useMultiFileAuthState
} from "baileys"
import { readdir, stat } from "fs/promises"
import { EventEmitter } from "events"
import { join } from "path"
import chalk from "chalk"
import P from "pino"
import {
  initReload,
  initCron,
  connectionUpdateHandler
} from "./lib/connection.js"

EventEmitter.defaultMaxListeners = 0
const pairingAuth = global.config.pairingAuth
const pairingNumber = global.config.pairingNumber

protoType()
serialize()

async function IZUMI() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth")
  const { version: baileysVersion } = await fetchLatestBaileysVersion()

  console.log(
    chalk.cyan.bold(`
╭────────────────────────────────────╮
│ 📡  Baileys Initialization 📡
│ ─────────────────────────────────
│ 📡  Baileys Version : v${baileysVersion.join(".")}
│ 📅  Date : ${new Date().toLocaleDateString("en-US", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    })}
│ 🌐  System : ${process.platform} CPU: ${process.arch}
╰────────────────────────────────────╯
`)
  )

  const connectionOptions = {
    version: baileysVersion,
    logger: P({ level: "silent" }),
    printQRInTerminal: !pairingAuth,
    browser: Browsers.ubuntu("Safari"),
    emitOwnEvents: true,
    markOnlineOnConnect: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        P().child({ level: "silent", stream: "store" })
      )
    }
  }

  global.conn = naruyaizumi(connectionOptions)
  conn.isInit = false

  if (pairingAuth && !conn.authState.creds.registered) {
    setTimeout(async () => {
      try {
        let code = await conn.restPairingCode(pairingNumber, conn.Pairing)
        code = code?.match(/.{1,4}/g)?.join("-") || code
        console.log(
          chalk.cyan.bold(`
╭────────────────────────────────────╮
│ 🎉  Pairing Code Ready to Use!  🎉
│ ─────────────────────────────────
│ 📲  Your Number    : ${chalk.white.bold(pairingNumber)}
│ 📄  Pairing Code  : ${chalk.white.bold(code)}
│ 🕒  Generated At  : ${chalk.white.bold(new Date().toLocaleString("en-US"))}
╰────────────────────────────────────╯
`)
        )
      } catch (err) {
        console.error("Failed to generate pairing code:", err)
      }
    }, 3000)
  }

  schedule(
    "db-flush",
    () => {
      try {
        global.sqlite.prepare("PRAGMA wal_checkpoint(FULL);").run()
        global.sqlite.prepare("PRAGMA optimize;").run()
      } catch (e) {
        console.error("DB checkpoint:", e)
      }
    },
    { intervalSeconds: 600 }
  )

  let isInit = true
  let handler = await import("./handler.js")

  global.reloadHandler = async function (restartConn = false) {
    try {
      const HandlerModule = await import(`./handler.js?update=${Date.now()}`).catch((e) => {
        console.error("🍂 Failed to import handler.js:", e)
        return null
      })

      if (HandlerModule && typeof HandlerModule.handler === "function") {
        handler = HandlerModule
        console.log(chalk.green("🍃 handler.js reloaded successfully"))
      } else {
        console.warn(chalk.yellow("🔥 handler.js loaded but no valid export found."))
      }
    } catch (e) {
      console.error("Error loading handler.js:", e)
    }

    if (restartConn) {
      const oldChats = global.conn?.chats || {}
      try {
        global.conn.ws?.close()
      } catch {/* ignore */}
      conn.ev.removeAllListeners()
      global.conn = naruyaizumi(connectionOptions, { chats: oldChats })
      isInit = true
    }

    if (!isInit && conn.ev) {
      for (const ev of [
        ["messages.upsert", conn.handler],
        ["group-participants.update", conn.participantsUpdate],
        ["message.delete", conn.onDelete],
        ["connection.update", conn.connectionUpdate],
        ["creds.update", conn.credsUpdate]
      ]) {
        if (typeof ev[1] === "function") conn.ev.off(ev[0], ev[1])
      }
    }

    conn.spromote = "@user sekarang admin!"
    conn.sdemote = "@user sekarang bukan admin!"
    conn.welcome = "Hallo @user Selamat datang di @subject\n\n@desc"
    conn.bye = "Selamat tinggal @user"
    conn.sRevoke = "Link group telah diubah ke \n@revoke"

    conn.handler = handler?.handler?.bind(global.conn) || (() => {})
    conn.participantsUpdate =
      handler?.participantsUpdate?.bind(global.conn) || (() => {})
    conn.onDelete = handler?.deleteUpdate?.bind(global.conn) || (() => {})
    conn.connectionUpdate = connectionUpdateHandler?.bind(global.conn) || (() => {})
    conn.credsUpdate = saveCreds?.bind(global.conn) || (() => {})

    if (conn.ev) {
      if (typeof conn.handler === "function")
        conn.ev.on("messages.upsert", conn.handler)
      if (typeof conn.participantsUpdate === "function")
        conn.ev.on("group-participants.update", conn.participantsUpdate)
      if (typeof conn.onDelete === "function")
        conn.ev.on("message.delete", conn.onDelete)
      if (typeof conn.connectionUpdate === "function")
        conn.ev.on("connection.update", conn.connectionUpdate)
      if (typeof conn.credsUpdate === "function")
        conn.ev.on("creds.update", conn.credsUpdate)
    }

    isInit = false
    return true
  }

  const pluginFolder = global.__dirname(
    join(global.__dirname(import.meta.url), "./plugins/index")
  )

  async function getAllPlugins(dir) {
    const results = []
    try {
      const files = await readdir(dir)
      for (const file of files) {
        const filepath = join(dir, file)
        const statInfo = await stat(filepath)
        if (statInfo.isDirectory()) {
          results.push(...(await getAllPlugins(filepath)))
        } else if (/\.js$/.test(file)) {
          results.push(filepath)
        }
      }
    } catch (err) {
      console.error("Failed to read plugin folder:", err.message)
    }
    return results
  }

  await initReload(conn, pluginFolder, getAllPlugins)
  initCron()
  await global.reloadHandler()
}

IZUMI()