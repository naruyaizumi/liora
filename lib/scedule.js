import { readdirSync, rmSync } from 'fs'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { otakudesu } from '../lib/scrape.js'

let fdoc = {
key: {
remoteJid: 'status@broadcast',
participant: '0@s.whatsapp.net'
},
message: {
documentMessage: {
title: '𝐃 𝐀 𝐓 𝐀 𝐁 𝐀 𝐒 𝐄'
}
}
}
let requestOptions = {
method: 'GET',
redirect: 'follow'
}

async function resetCommand() {
let user = global.db.data.users
let jumlah = 0
for (let id in user) {
if (typeof user[id] === 'object') {
user[id].command = 0
user[id].commandLimit = 1000
user[id].cmdLimitMsg = 0
jumlah++
}
}
}

async function resetChat() {
let users = global.db.data.users
for (let id in users) {
if (typeof users[id].chat !== 'undefined') {
users[id].chat = 0
}
}
let chat = global.db.data.chats
let arr = Object.entries(chat)
.filter(([_, data]) => typeof data === 'object' && 'member' in data)
.map(([id]) => id)
for (let id of arr) {
chat[id].member = {}
}
}

async function resetLimit() {
let user = global.db.data.users
for (let number in user) {
if (user[number].limit <= 20) {
user[number].limit = 20
}
}
}

async function resetCryptoPrice() {
let invest = global.db.data.bots.invest.item
let data = Object.keys(invest)
for (let name of data) {
invest[name].hargaBefore = invest[name].harga
}
}

async function resetSahamPrice() {
let saham = global.db.data.bots.saham.item
let data = Object.keys(saham)
for (let name of data) {
saham[name].hargaBefore = saham[name].harga
}
}

async function resetVolumeSaham() {
let bot = global.db.data.bots
let data = Object.keys(bot.saham.item)
for (let v of data) {
bot.saham.item[v].volumeBuy = 0
bot.saham.item[v].volumeSell = 0
}
}

async function resetVolumeCrypto() {
let bot = global.db.data.bots
let data = Object.keys(bot.invest.item)
for (let v of data) {
bot.invest.item[v].volumeBuy = 0
bot.invest.item[v].volumeSell = 0
}
}

async function Backup() {
let setting = global.db.data.settings[conn.user.jid]
if (setting.backup) {
let d = new Date
let date = d.toLocaleDateString('id', {
day: 'numeric',
month: 'long',
year: 'numeric'
})
let database = fs.readFileSync('./database.json')
for (let [jid] of global.config.owner.filter(([number, _, developer]) => number && developer)) {
conn.reply(jid + '@s.whatsapp.net', `*🗓️ Database: ${date}*`, null)
conn.sendMessage(jid + '@s.whatsapp.net', { document: database, mimetype: 'application/json', fileName: 'database.json' }, { quoted: fdoc })
}
}
}

function clearMemory() {
if (conn.spam) conn.spam = {}
if (conn.khodam) conn.khodam = {}
}

async function OtakuNews() {
let chat = global.db.data.chats
let bot = global.db.data.bots
let data = await otakudesu.ongoing()
if (!Array.isArray(data)) return
if (data.length == 0) return
if (data[0].title !== bot.otakuNow) {
bot.otakuNow = data[0].title
let groups = Object.entries(conn.chats)
.filter(([jid, chat]) =>
jid.endsWith('@g.us') &&
chat.isChats &&
!chat.metadata?.read_only &&
!chat.metadata?.announce &&
!chat.isCommunity &&
!chat.isCommunityAnnounce &&
!chat?.metadata?.isCommunity &&
!chat?.metadata?.isCommunityAnnounce
).map(v => v[0])
let { status, total_eps, duration, studio, genre, synopsis } = await otakudesu.detail(data[0].link)
for (let v of groups) {
if (!chat[v].otakuNews) continue
chat[v].otakuNow = data[0].title
let caption = `
🔥 *OtakuDesu Terbaru!* 🔥
━━━━━━━━━━━━━━━━━━━
✨ *Judul : ${data[0].title} ${data[0].episode}*
📌 *Status : ${status}*
🎬 *Total Episode : ${total_eps}*
⏱️ *Durasi : ${duration}*
🏢 *Studio : ${studio}*
🌟 *Genre : ${genre}*
━━━━━━━━━━━━━━━━━━━
📖 *Sinopsis:* 
${synopsis ? `${synopsis}` : "*Belum tersedia. Nikmati langsung episodenya!*"}
━━━━━━━━━━━━━━━━━━━
🌐 *Tonton sekarang hanya di OtakuDesu!*
`.trim()
await conn.sendFile(v, data[0].image, null, caption, null)
}
}
}

async function checkGempa() {
let chat = global.db.data.chats
let bot = global.db.data.bots
let res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json')
let json = await res.json()
let gempa = json.Infogempa.gempa
if (gempa.DateTime !== bot.gempaDateTime) {
bot.gempaDateTime = gempa.DateTime
let groups = Object.entries(conn.chats)
.filter(([jid, chat]) =>
jid.endsWith('@g.us') &&
chat.isChats &&
!chat.metadata?.read_only &&
!chat.metadata?.announce &&
!chat.isCommunity &&
!chat.isCommunityAnnounce &&
!chat?.metadata?.isCommunity &&
!chat?.metadata?.isCommunityAnnounce
).map(v => v[0])
for (let number of groups) {
if (chat[number].notifgempa && gempa.DateTime !== chat[number].gempaDateTime) {
chat[number].gempaDateTime = gempa.DateTime
let mmiInfo = gempa.Dirasakan ? `📍 *Wilayah yang Merasakan : ${gempa.Dirasakan} Skala MMI*` : `📍 *Wilayah yang Merasakan : Tidak ada data*`
let caption = `
🍥 *Informasi Gempa Terkini - BMKG* 🍥
━━━━━━━━━━━━━━━━━━━
📅 *Tanggal : ${gempa.Tanggal}*
🕒 *Waktu : ${gempa.Jam} WIB*
🕒 *Waktu : ${gempa.DateTime} UTC*
📍 *Lokasi : ${gempa.Wilayah}*
🌐 *Koordinat : ${gempa.Coordinates} Latitude, Longitude*
💪 *Magnitudo : ${gempa.Magnitude}*
📏 *Kedalaman : ${gempa.Kedalaman}*
⚠️ *Potensi : ${gempa.Potensi}*
━━━━━━━━━━━━━━━━━━━
${mmiInfo}
🗺️ *Peta Guncangan Shakemap : Terlampir di atas.*
━━━━━━━━━━━━━━━━━━━
📢 *Sumber Data :*
*_Data ini berasal dari BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)_*
`.trim()
await conn.sendFile(number, 'https://data.bmkg.go.id/DataMKG/TEWS/' + gempa.Shakemap, 'shakemap.jpg', caption, false)
}
}
}
}

async function checkSewa() {
let chat = global.db.data.chats
let data = Object.keys(chat).filter(v => chat[v].expired > 0 && new Date() * 1 - chat[v].expired > 0)
for (let number of data) {
try {
let groupMetadata = await conn.groupMetadata(number)
await conn.reply(number, `🍰 *Waktu sewa ${conn.user.name} sudah habis~* 🍓\n\n🧁 *Jangan lupa perpanjang sewanya ya biar aku tetap bisa nemenin grup ini~*`, null)
await conn.sendContact(number, global.config.owner, null)
await conn.groupLeave(number)
chat[number].expired = 0
} catch {
chat[number].expired = 0
}
}
}

async function checkPremium() {
let user = global.db.data.users
let data = Object.keys(user).filter(v => user[v].premiumTime > 0 && new Date() * 1 - user[v].premiumTime > 0)
for (let number of data) {
let userName = user[number].registered ? user[number].name : conn.getName(number)
await conn.reply(number,
`🍓 *Hai ${userName}~* 🍓\n\n` +
`🍮 *Masa premium kamu sudah habis, loh!* 😿\n` +
`🍬 *Kalau kamu mau lanjut jadi pengguna premium, tinggal hubungi owner di bawah ini ya~* ✨\n\n` +
`🧁 *Terima kasih sudah jadi bagian spesial dari pengguna premium-ku. Semoga kita bisa bertemu lagi~!*`, null)
await conn.sendContact(number, global.config.owner, null)
user[number].premiumTime = 0
user[number].premium = false
}
}

async function updateSaham() {
let bot = global.db.data.bots
let persen = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03]
let saham = Object.entries(bot.saham.item)
for (let [name, value] of saham) {
let volNaik = value.rise.filter(v => v === 'naik').length
let volTurun = value.rise.filter(v => v === 'turun').length
if ((value.volumeBuy - value.volumeSell) > 10000 && volNaik === 1) {
value.rise.push('naik')
} else if ((value.volumeSell - value.volumeBuy) > 10000 && volTurun === 1) {
value.rise.push('turun')
} else if ((value.volumeBuy - value.volumeSell) < 10000 && volNaik === 2) {
let indexNaik = value.rise.indexOf('naik')
if (indexNaik !== -1) value.rise.splice(indexNaik, 1)
} else if ((value.volumeSell - value.volumeBuy) < 10000 && volTurun === 2) {
let indexTurun = value.rise.indexOf('turun')
if (indexTurun !== -1) value.rise.splice(indexTurun, 1)
}
let isPersen = persen[Math.floor(Math.random() * persen.length)]
let fluktuasi = parseInt((value.harga * isPersen).toFixed(0))
let isRise = value.rise[Math.floor(Math.random() * value.rise.length)]
if (isRise === 'naik') {
value.harga += fluktuasi
} else if (isRise === 'turun') {
value.harga -= fluktuasi
}
if (value.harga < 1) value.harga = 1
}
}

async function updateCrypto() {
let bot = global.db.data.bots
let persen = [0.005, 0.01, 0.015, 0.02, 0.03]
let invest = Object.entries(bot.invest.item)
for (let [name, value] of invest) {
let volNaik = value.rise.filter(v => v === 'naik').length
let volTurun = value.rise.filter(v => v === 'turun').length
if (value.volumeBuy - value.volumeSell > 10000 && volNaik === 1) {
value.rise.push('naik')
} else if (value.volumeSell - value.volumeBuy > 10000 && volTurun === 1) {
value.rise.push('turun')
} else if (value.volumeBuy - value.volumeSell < 10000 && volNaik === 2) {
let indexNaik = value.rise.indexOf('naik')
if (indexNaik !== -1) value.rise.splice(indexNaik, 1)
} else if (value.volumeSell - value.volumeBuy < 10000 && volTurun === 2) {
let indexTurun = value.rise.indexOf('turun')
if (indexTurun !== -1) value.rise.splice(indexTurun, 1)
}
let isPersen = persen[Math.floor(Math.random() * persen.length)]
let fluktuasi = parseInt((value.harga * isPersen).toFixed(0))
let isRise = value.rise[Math.floor(Math.random() * value.rise.length)]
if (isRise === "naik") {
value.harga += fluktuasi
} else if (isRise === "turun") {
value.harga -= fluktuasi
}
if (value.harga < 1) value.harga = 1
}
}

function clearTmp() {
let __dirname = global.__dirname(import.meta.url)
let tmp = [os.tmpdir(), path.join(__dirname, '../tmp')]
tmp.forEach(dirname => {
if (!fs.existsSync(dirname)) {
fs.mkdirSync(dirname, { recursive: true })
}
})
let filenames = []
tmp.forEach(dirname => {
try {
fs.readdirSync(dirname).forEach(file => filenames.push(path.join(dirname, file)))
} catch {}
})
filenames.forEach(file => {
try {
let stats = fs.statSync(file)
if (stats.isFile() && (Date.now() - stats.mtimeMs >= 1000 * 60 * 5)) {
fs.unlinkSync(file)
}
} catch {}
})
}

export { resetSahamPrice, resetCryptoPrice, resetLimit, resetChat, resetCommand, Backup, resetVolumeSaham, resetVolumeCrypto, clearMemory, OtakuNews, checkGempa, updateSaham, updateCrypto, checkPremium, checkSewa, clearTmp }