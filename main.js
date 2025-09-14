import './config.js'
import cron from "node-cron"
import { checkSewa, checkPremium, resetSahamPrice, resetCryptoPrice, resetLimit, resetChat, resetCommand, Backup, resetVolumeSaham, resetVolumeCrypto, clearMemory, OtakuNews, checkGempa, updateSaham, clearTmp, updateCrypto } from "./lib/scedule.js"
import { createRequire } from "module"
import path, { join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { platform } from 'process'
import { readdirSync, unlinkSync, existsSync, readFileSync, watch } from 'fs'
import yargs from 'yargs'
import syntaxerror from 'syntax-error'
import chalk from 'chalk'
import P from 'pino'
import { format } from 'util'
import { makeWASocket, protoType, serialize } from './lib/simple.js'
import { JSONFilePreset } from 'lowdb/node'
import { EventEmitter } from 'events'
import pkg from 'baileys'
const { DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers, useMultiFileAuthState } = pkg
EventEmitter.defaultMaxListeners = 0
const pairingAuth = global.config.pairingAuth
const pairingNumber = global.config.pairingNumber

protoType()
serialize()

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString()
}
global.__dirname = function dirname(pathURL) {
return path.dirname(global.__filename(pathURL, true))
}
global.__require = function require(dir = import.meta.url) {
return createRequire(dir)
}
global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.config.APIs ? global.config.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({
...query, ...(apikeyqueryname ? {
[apikeyqueryname]: global.config.APIKeys[name in global.config.APIs ? global.config.APIs[name] : name]
} : {})
})) : '')
global.timestamp = {
start: new Date()
}
const ROOT = global.__dirname(import.meta.url)
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
const db = await JSONFilePreset(path.join(ROOT, 'database.json'), {
users: {},
chats: {},
stats: {},
settings: {},
bots: {}
})
global.db = db
global.loadDatabase = async function () {
await db.read()
}

await loadDatabase()

async function IZUMI() {
const { state, saveCreds } = await useMultiFileAuthState('./auth')
const { version: baileysVersion } = await fetchLatestBaileysVersion()
console.log(chalk.cyan.bold(`
╭────────────────────────────────────╮
│ 📡  Baileys Initialization 📡
│ ─────────────────────────────────
│ 📡  Baileys Version : v${baileysVersion.join('.')}
│ 📅  Date : ${new Date().toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
│ 🌐  System : ${process.platform} CPU: ${process.arch}
╰────────────────────────────────────╯
`))
const connectionOptions = {
version: baileysVersion,
logger: P({ level: 'silent' }),
printQRInTerminal: !pairingAuth,
browser: Browsers.ubuntu('Safari'),
emitOwnEvents: true,
auth: {
creds: state.creds,
keys: makeCacheableSignalKeyStore(state.keys, P().child({
level: 'silent',
stream: 'store'
}))
}
}
global.conn = makeWASocket(connectionOptions)
conn.isInit = false
if (pairingAuth && !conn.authState.creds.registered) {
setTimeout(async () => {
let code = await conn.requestPairingCode(pairingNumber, conn.Pairing)
code = code?.match(/.{1,4}/g)?.join("-") || code
console.log(chalk.cyan.bold(`
╭────────────────────────────────────╮
│ 🎉  Pairing Code Ready to Use!  🎉
│ ─────────────────────────────────
│ 📲  Your Number    : ${chalk.white.bold(pairingNumber)}
│ 📄  Pairing Code  : ${chalk.white.bold(code)}
│ 🕒  Generated At  : ${chalk.white.bold(new Date().toLocaleString('en-US'))}
╰────────────────────────────────────╯
`))
}, 3000)
}

setInterval(async () => {
if (global.db.data) await global.db.write().catch(console.error)
}, 10 * 1000)
cron.schedule('0 0 * * *', async () => {
await resetCommand()
await resetChat()
await resetLimit()
await resetCryptoPrice()
await resetSahamPrice()
}, { scheduled: true, timezone: "Asia/Jakarta" })
cron.schedule('0 */6 * * *', async () => {
await Backup()
await resetVolumeSaham()
await resetVolumeCrypto()
await clearTmp()
await clearMemory()
}, { scheduled: true, timezone: "Asia/Jakarta" })
cron.schedule('*/10 * * * *', async () => {
await updateSaham()
await updateCrypto()
await checkGempa()
await OtakuNews()
await checkSewa()
await checkPremium()
}, { scheduled: true, timezone: "Asia/Jakarta" })

async function connectionUpdate(update) {
const { connection, lastDisconnect } = update
if (connection === 'connecting') {
console.log('🍜 Connecting...')
}
if (connection === 'open') {
console.log('🍕 Connected')
}
if (connection === 'close') {
console.log('🍩 Disconnected, trying to reconnect...')
if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
await global.reloadHandler(true)
}
}
if (global.db.data == null) await global.loadDatabase()
}

process.on('uncaughtException', console.error)
let isInit = true
let handler = await import('./handler.js')
global.reloadHandler = async function (restartConn) {
try {
const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error)
if (Object.keys(Handler || {}).length) handler = Handler
} catch (e) {
console.error(e)
}
if (restartConn) {
const oldChats = global.conn.chats
try {
global.conn.ws.close()
} catch {}
conn.ev.removeAllListeners()
global.conn = makeWASocket(connectionOptions, {
chats: oldChats
})
isInit = true
}
if (!isInit) {
conn.ev.off('messages.upsert', conn.handler)
conn.ev.off('group-participants.update', conn.participantsUpdate)
conn.ev.off('message.delete', conn.onDelete)
conn.ev.off('connection.update', conn.connectionUpdate)
conn.ev.off('creds.update', conn.credsUpdate)
}
conn.spromote = '@user sekarang admin!'
conn.sdemote = '@user sekarang bukan admin!'
conn.welcome = 'Hallo @user Selamat datang di @subject\n\n@desc'
conn.bye = 'Selamat tinggal @user'
conn.sRevoke = 'Link group telah diubah ke \n@revoke'
conn.handler = handler.handler.bind(global.conn)
conn.participantsUpdate = handler.participantsUpdate.bind(global.conn)
conn.onDelete = handler.deleteUpdate.bind(global.conn)
conn.connectionUpdate = connectionUpdate.bind(global.conn)
conn.credsUpdate = saveCreds.bind(global.conn)
conn.ev.on('messages.upsert', conn.handler)
conn.ev.on('group-participants.update', conn.participantsUpdate)
conn.ev.on('message.delete', conn.onDelete)
conn.ev.on('connection.update', conn.connectionUpdate)
conn.ev.on('creds.update', conn.credsUpdate)
isInit = false
return true
}
const pluginFolder = global.__dirname(join(ROOT, './plugins/index'))
const pluginFilter = filename => /\.js$/.test(filename)
global.plugins = {}
async function filesInit() {
for (let filename of readdirSync(pluginFolder).filter(pluginFilter)) {
try {
let file = global.__filename(join(pluginFolder, filename))
const module = await import(file)
global.plugins[filename] = module.default || module
} catch (e) {
conn.logger.error(e)
delete global.plugins[filename]
}
}
}
filesInit().catch(console.error)
global.reload = async (_ev, filename) => {
if (pluginFilter(filename)) {
let dir = global.__filename(join(pluginFolder, filename), true)
if (filename in global.plugins) {
if (existsSync(dir)) conn.logger.info(`🍃 Reloading plugin '${filename}'`)
else {
conn.logger.warn(`⚠️ Plugin '${filename}' has been removed`)
return delete global.plugins[filename]
}
} else conn.logger.info(`📢 Loading new plugin: '${filename}'`)
let err = syntaxerror(readFileSync(dir), filename, {
sourceType: 'module',
allowAwaitOutsideFunction: true
})
if (err) {
conn.logger.error([
`❌ Plugin Error: '${filename}'`,
`🧠 Message: ${err.message}`,
`📍 Line: ${err.line}, Column: ${err.column}`,
`🔎 ${err.annotated}`
].join('\n'))
return
}
try {
const module = (await import(`${global.__filename(dir)}?update=${Date.now()}`))
global.plugins[filename] = module.default || module
} catch (e) {
conn.logger.error(`❌ Error while loading plugin '${filename}'\n${format(e)}`)
} finally {
global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)))
}
}
}
Object.freeze(global.reload)
watch(pluginFolder, global.reload)
await global.reloadHandler()
}

IZUMI()