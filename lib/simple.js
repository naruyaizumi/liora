import path from 'path'
import chalk from 'chalk'
import { parsePhoneNumber } from 'awesome-phonenumber'
import fs from 'fs'
import util from 'util'
import { fileTypeFromBuffer } from 'file-type'
import { format } from 'util'
import { fileURLToPath } from 'url'
import store from './store.js'
import sharp from 'sharp'
import crypto from 'crypto'
import moment from 'moment-timezone'
import pkg from 'baileys'
const { default: _makeWaSocket, proto, downloadContentFromMessage, jidDecode, areJidsSameUser, generateForwardMessageContent, generateWAMessageFromContent, generateWAMessage, WAMessageStubType, extractMessageContent, prepareWAMessageMedia } = pkg

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function toSHA256(str) {
return crypto.createHash('sha256').update(str).digest('hex')
}

export function makeWASocket(connectionOptions, options = {}) {
let conn = _makeWaSocket(connectionOptions)
Object.defineProperties(conn, {
chats: {
value: { ...(options.chats || {}) },
writable: true
},
decodeJid: {
value(jid) {
if (!jid || typeof jid !== 'string') return (!nullish(jid) && jid) || null
return jid.decodeJid()
}
},
logger: {
get() {
return {
info(...args) {
console.log(
chalk.green.bold('🔥 INFO'),
`[${chalk.white.bold(moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'))}]:`,
chalk.cyan.bold(format(...args))
)
},
error(...args) {
console.log(
chalk.red.bold('🫧 ERROR'),
`[${chalk.white.bold(moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'))}]:`,
chalk.redBright.bold(format(...args))
)
},
warn(...args) {
console.log(
chalk.yellow.bold('📡 WARNING'),
`[${chalk.white.bold(moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'))}]:`,
chalk.yellowBright.bold(format(...args))
)
},
trace(...args) {
console.log(
chalk.gray.bold('🍥 TRACE'),
`[${chalk.white.bold(moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'))}]:`,
chalk.gray(format(...args))
)
},
debug(...args) {
console.log(
chalk.blue.bold('🌏 DEBUG'),
`[${chalk.white.bold(moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'))}]:`,
chalk.white.bold(format(...args))
)
}
}
},
enumerable: true
},
smlcap: {
value(text, except = []) {
if (!text) return text
let regex = /(wa.me|https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/gi
let link = text.match(regex)
let bold = char => {
let code = char.charCodeAt(0)
if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D5D4 + (code - 65))
if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5EE + (code - 97))
return char
}
let convert = str => str.split('').map(bold).join('')
let result = convert(text)

for (let i = 0; i < except.length; i++) {
result = result.replace(convert(except[i]), except[i])
}
if (link) {
for (let i = 0; i < link.length; i++) {
result = result.replace(convert(link[i]), link[i])
}
}
return result
},
enumerable: true
},
getFile: {
async value(PATH, saveToFile = false) {
let res, filename
const data = Buffer.isBuffer(PATH)
? PATH
: PATH instanceof ArrayBuffer
? Buffer.from(PATH)
: /^data:.*?\/.*?;base64,/i.test(PATH)
? Buffer.from(PATH.split`,`[1], 'base64')
: /^https?:\/\//.test(PATH)
? (res = await fetch(PATH), Buffer.from(await res.arrayBuffer()))
: fs.existsSync(PATH)
? (filename = PATH, fs.readFileSync(PATH))
: typeof PATH === 'string'
? Buffer.from(PATH)
: Buffer.alloc(0)
if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
const type = await fileTypeFromBuffer(data) || {
mime: 'application/octet-stream',
ext: '.bin'
}
if (data && saveToFile && !filename)
filename = path.join(__dirname, '../tmp/' + new Date * 1 + '.' + type.ext),
await fs.promises.writeFile(filename, data)

return {
res,
filename,
...type,
data,
deleteFile() {
return filename && fs.promises.unlink(filename)
}
}
},
enumerable: true
},
resize: {
async value(buffer, uk1, uk2) {
return await sharp(buffer)
.resize(uk1, uk2, {
fit: 'contain',
background: { r: 0, g: 0, b: 0, alpha: 0 }
})
.jpeg()
.toBuffer()
},
enumerable: true
},
sendFile: {
async value(jid, path, filename = '', text = '', quoted, ptt = false, options = {}, smlcap = { smlcap: true }) {
let isSmlcap = global.db.data.settings[conn.user.jid].smlcap && smlcap.smlcap
let ephemeral = conn.chats[jid]?.metadata?.ephemeralDuration || conn.chats[jid]?.ephemeralDuration || false
let caption = isSmlcap ? conn.smlcap(text, smlcap.except ? smlcap.except : false) : text
let type = await conn.getFile(path, true)
let { res, data: file, filename: pathFile } = type
if (res?.status !== 200 || file.length <= 65536) {
try { throw { json: JSON.parse(file.toString()) } }
catch (e) { if (e.json) throw e.json }
}
const fileSize = fs.statSync(pathFile).size / 1024 / 1024
let opt = {}
if (quoted) opt.quoted = quoted
if (!type) options.asDocument = true
let mtype = '', mimetype = options.mimetype || type.mime, convert
if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker'
else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image'
else if (/video/.test(type.mime)) {
if (options.asPTV) {
mtype = 'video'
options.ptv = true
} else mtype = 'video'
}
else if (/audio/.test(type.mime)) {
let output = tmpFile('.opus')
await exec(`ffmpeg -i ${pathFile} -vn -c:a libopus -b:a 128k ${output}`)
file = fs.readFileSync(output)
pathFile = output
mtype = 'audio'
mimetype = options.mimetype || 'audio/ogg; codecs=opus'
}
else mtype = 'document'
if (options.asDocument) mtype = 'document'
for (let o of ['asSticker', 'asLocation', 'asVideo', 'asDocument', 'asImage'])
delete options[o]
let message = {
...options,
caption,
ptt,
ptv: options.ptv || false,
[mtype]: { url: pathFile },
mimetype,
fileName: filename || pathFile.split('/').pop()
}
let m
try {
m = await conn.sendMessage(jid, message, { ...opt, ...options, ephemeralExpiration: ephemeral })
} catch (e) {
console.error(e)
m = null
} finally {
if (!m) m = await conn.sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options, ephemeralExpiration: ephemeral })
file = null
return m
}
},
enumerable: true
},
sendContact: {
async value(jid, data, quoted, options) {
if (!Array.isArray(data[0]) && typeof data[0] === 'string') data = [data]
let contacts = []
let ephemeral = conn.chats[jid]?.metadata?.ephemeralDuration || conn.chats[jid]?.ephemeralDuration || false
for (let [number, nameRaw] of data) {
number = number.replace(/\D/g, '')
let njid = number + '@s.whatsapp.net'
let name = (await conn.getName(njid)) || nameRaw || 'Tanpa Nama'
let biz = await conn.getBusinessProfile(njid).catch(_ => null) || {}
let phone = parsePhoneNumber('+' + number)
let intl = phone.valid ? phone.number.international : '+' + number
let national = phone.valid ? phone.number.national : number
let country = phone.valid ? phone.regionCode : 'ID'
let vcard = `
BEGIN:VCARD
VERSION:3.0
N:;${name.replace(/\n/g, '\\n')};;;
FN:${name.replace(/\n/g, '\\n')}
ORG:${biz?.title || 'Pengguna WhatsApp'}
TITLE:${biz?.category || '-'}
EMAIL;type=INTERNET:-
TEL;type=CELL;type=VOICE;waid=${number}:${intl}
item1.X-ABLabel:WhatsApp
item2.ADR;type=WORK:;;Indonesia;;;;
item3.X-ABADR:${country}
${biz.description ? `
X-WA-BIZ-NAME:${(conn.chats[njid]?.vname || name).replace(/\n/g, '\\n')}
X-WA-BIZ-DESCRIPTION:${biz.description.replace(/\n/g, '\\n')}
`.trim() : ''}
END:VCARD
`.trim()
contacts.push({
vcard,
displayName: name
})
}
return await conn.sendMessage(jid, {
...options,
contacts: {
displayName: contacts.length >= 2 ? `${contacts.length} kontak` : contacts[0].displayName || null,
contacts
}
}, {
quoted,
...options,
ephemeralExpiration: ephemeral
})
},
enumerable: true
},
reply: {
async value(jid, text = '', quoted, options = {}, smlcap = { smlcap: true }) {
let isSmlcap = global.db.data.settings[conn.user.jid].smlcap && smlcap.smlcap
let ephemeral = conn.chats[jid]?.metadata?.ephemeralDuration || conn.chats[jid]?.ephemeralDuration || false
if (global.db.data.settings[conn.user.jid].adReply) {
let thumb = [
'https://cloudkuimages.guru/uploads/images/LUjvk4tK.jpg',
'https://cloudkuimages.guru/uploads/images/pPrNqD2g.jpg',
'https://cloudkuimages.guru/uploads/images/CAlWPwci.jpg',
'https://cloudkuimages.guru/uploads/images/70vJx4rd.jpg',
'https://cloudkuimages.guru/uploads/images/2x53wXGY.jpg',
'https://cloudkuimages.guru/uploads/images/S1puVzbq.jpg',
'https://cloudkuimages.guru/uploads/images/S9X7co3v.jpg']
return Buffer.isBuffer(text)
? conn.sendFile(jid, text, 'file', '', quoted, false, options)
: conn.adReply(jid, text, global.config.watermark, global.config.author, Buffer.from(await (await fetch(thumb.getRandom())).arrayBuffer()), false, quoted, false, false, smlcap)
} else {
return Buffer.isBuffer(text)
? conn.sendFile(jid, text, 'file', '', quoted, false, options)
: conn.sendMessage(jid, {
text: isSmlcap ? conn.smlcap(text, smlcap.except ? smlcap.except : false) : text,
...options,
}, {
quoted,
...options,
ephemeralExpiration: ephemeral
})
}
}
},
adReply: {
async value(jid, text, title = '', body = '', buffer, source = '', quoted, large = true, options = {}, smlcap = { smlcap: true }) {
let isSmlcap = global.db.data.settings[conn.user.jid].smlcap && smlcap.smlcap
let ephemeral = conn.chats[jid]?.metadata?.ephemeralDuration || conn.chats[jid]?.ephemeralDuration || false
let { data } = await conn.getFile(buffer, true)
let hwaifu = JSON.parse(fs.readFileSync('./json/hwaifu.json', 'utf-8'))
return conn.sendMessage(jid, {
text: isSmlcap ? conn.smlcap(text, smlcap.except ? smlcap.except : false) : text,
contextInfo: {
mentionedJid: await conn.parseMention(text),
externalAdReply: {
mediaType: 1,
title: title,
body: body,
thumbnail: data,
renderLargerThumbnail: large ? true : false,
mediaUrl: hwaifu.getRandom(),
sourceUrl: source
}
}
}, {
quoted: quoted,
...options,
ephemeralExpiration: ephemeral
})
},
enumerable: true
},
NsId: {
value: String.fromCharCode(
49, 50, 48, 51, 54, 51, 52, 49, 55, 52, 49, 49, 56, 53, 48, 51, 49, 57, 64,
110, 101, 119, 115, 108, 101, 116, 116, 101, 114
),
writable: false,
enumerable: true
},
sendButton: {
async value(jid, text, footer, image, button, m, options = {}, smlcap = { smlcap: true }) {
image = options?.contextInfo?.externalAdReply?.thumbnail || image
let mType, media
if (image) {
let { data, mime } = await conn.getFile(image, true)
mType = mime.split("/")[0]
media = await prepareWAMessageMedia(
{ [mType]: data },
{ upload: conn.waUploadToServer }
)
}
let isSmlcap = global.db.data.settings[conn.user.jid].smlcap && smlcap.smlcap
let ephemeral = conn.chats[jid]?.metadata?.ephemeralDuration || conn.chats[jid]?.ephemeralDuration || false
let msg = generateWAMessageFromContent(m.chat, {
viewOnceMessage: {
message: {
"messageContextInfo": {
"deviceListMetadata": {},
"deviceListMetadataVersion": 2
},
interactiveMessage: proto.Message.InteractiveMessage.create({
body: proto.Message.InteractiveMessage.Body.create({
text: isSmlcap ? conn.smlcap(text, smlcap.except ? smlcap.except : false) : text,
}),
footer: proto.Message.InteractiveMessage.Footer.create({
text: isSmlcap ? conn.smlcap(footer, smlcap.except ? smlcap.except : false) : footer,
}),
header: proto.Message.InteractiveMessage.Header.create({
title: "",
subtitle: "",
hasMediaAttachment: false,
...(image ? media : {})
}),
...options,
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
buttons: button
})
})
}
}
}, { quoted: m, ephemeralExpiration: ephemeral }, {})
return await conn.relayMessage(jid, msg.message, {})
},
enumerable: true
},
textList: {
async value(jid, text, image, list = [], m, options = {}, smlcap = { smlcap: true }) {
if (!Array.isArray(list)) list = []
image = options?.contextInfo?.externalAdReply?.thumbnail || image
let mType, media
if (image) {
let { data, mime } = await conn.getFile(image, true)
mType = mime.split("/")[0]
media = await prepareWAMessageMedia({ [mType]: data }, { upload: conn.waUploadToServer })
}
let isSmlcap = global.db.data.settings[conn.user.jid]?.smlcap && smlcap.smlcap
let listMsg = list.map(v => ({
header: "",
title: v[2]?.split("\n")[0]?.trim() || "No Title",
description: v[2]?.split("\n").slice(1).map(x => x.trim()).join(", ") || "No Description",
id: v[0] || "id_null"
}))
let button = [{
name: "single_select",
buttonParamsJson: JSON.stringify({
title: "🍭 𝗣𝗶𝗹𝗶𝗵 𝗱𝗶 𝗦𝗶𝗻𝗶~",
sections: [{
title: "🌸 𝗗𝗮𝗳𝘁𝗮𝗿 𝗧𝗲𝗿𝘀𝗲𝗱𝗶𝗮",
highlight_label: "© Naruya Izumi",
rows: listMsg
}]
})
}]
let msg = await generateWAMessageFromContent(jid, {
interactiveMessage: proto.Message.InteractiveMessage.create({
body: { text: isSmlcap ? conn.smlcap(text, smlcap.except || false) : text },
footer: { text: global.config.watermark },
header: {
title: "",
subtitle: "",
hasMediaAttachment: !!media,
...(media || {})
},
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
buttons: button
})
})
}, {
quoted: m,
ephemeralExpiration: conn.chats[jid]?.metadata?.ephemeralDuration || conn.chats[jid]?.ephemeralDuration || false
})
return await conn.relayMessage(jid, msg.message, { messageId: msg.key.id })
},
enumerable: true
},
textOptions: {
async value(jid, text, image, list = [], m, options = {}, smlcap = { smlcap: true }) {
if (!Array.isArray(list)) {
list = []
}
image = options?.contextInfo?.externalAdReply?.thumbnail || image
let mType, media
if (image) {
let { data, mime } = await conn.getFile(image, true)
mType = mime.split("/")[0]
media = await prepareWAMessageMedia(
{ [mType]: data },
{ upload: conn.waUploadToServer }
)
}
let isSmlcap = global.db.data.settings[conn.user.jid].smlcap && smlcap.smlcap
let ephemeral = conn.chats[jid]?.metadata?.ephemeralDuration || conn.chats[jid]?.ephemeralDuration || false
let button = list.map(v => {
return {
"name": "quick_reply",
"buttonParamsJson": JSON.stringify({ display_text: v[1], id: v[0] }) 
}
})
let msg = generateWAMessageFromContent(m.chat, {
viewOnceMessage: {
message: {
"messageContextInfo": {
"deviceListMetadata": {},
"deviceListMetadataVersion": 2
},
interactiveMessage: proto.Message.InteractiveMessage.create({
body: proto.Message.InteractiveMessage.Body.create({
text: isSmlcap ? conn.smlcap(text, smlcap.except ? smlcap.except : false) : text,
}),
footer: proto.Message.InteractiveMessage.Footer.create({
text: global.config.watermark,
}),
header: proto.Message.InteractiveMessage.Header.create({
title: "",
subtitle: "",
hasMediaAttachment: false,
...(image ? media : {})
}),
...options,
nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
buttons: button
})
})
}
}
}, { quoted: m, ephemeralExpiration: ephemeral }, {})
return await conn.relayMessage(jid, msg.message, {})
},
enumerable: true
},
textInput: {
async value(jid, text, image, input, m, options = {}, smlcap = { smlcap: true }) {
let caption = `
${text}
`.trim()
let metadata = toSHA256(caption)
if (image) {
await conn.sendFile(jid, image, null, caption, m, false, options, smlcap)
} else {
await conn.reply(jid, caption, m, options, smlcap)
}
global.db.data.bots.replyText[metadata] = {
text: caption,
list: false,
command: input
}
},
enumerable: true
},
preSudo: {
async value(text, who, m, chatupdate) {
let messages = await generateWAMessage( m.chat, { text, mentions: await conn.parseMention(text) }, { userJid: who, quoted: m.quoted && m.quoted.fakeObj })
messages.key.fromMe = areJidsSameUser(who, conn.user.id)
messages.key.id = m.key.id
messages.pushName = m.name
if (m.isGroup) messages.key.participant = messages.participant = who
let msg = { ...chatupdate, messages: [proto.WebMessageInfo.fromObject(messages)].map((v) => ((v.conn = this), v)), type: "append" }
return msg
}
},
sendReact: {
async value(jid, text, key) {
return conn.sendMessage(jid, { react: { text: text, key: key } });
}
},
cMod: {
value(jid, message, text = '', sender = conn.user.jid, options = {}) {
if (options.mentions && !Array.isArray(options.mentions)) options.mentions = [options.mentions]
let copy = message.toJSON()
delete copy.message.messageContextInfo
delete copy.message.senderKeyDistributionMessage
let mtype = Object.keys(copy.message)[0]
let msg = copy.message
let content = msg[mtype]
if (typeof content === 'string') msg[mtype] = text || content
else if (content.caption) content.caption = text || content.caption
else if (content.text) content.text = text || content.text
if (typeof content !== 'string') {
msg[mtype] = { ...content, ...options }
msg[mtype].contextInfo = {
...(content.contextInfo || {}),
mentionedJid: options.mentions || content.contextInfo?.mentionedJid || []
}
}
if (copy.participant) sender = copy.participant = sender || copy.participant
else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid
else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid
copy.key.remoteJid = jid
copy.key.fromMe = areJidsSameUser(sender, conn.user.id) || false
return proto.WebMessageInfo.fromObject(copy)
},
enumerable: true
},
copyNForward: {
async value(jid, message, forwardingScore = true, options = {}) {
let vtype
if (options.readViewOnce && message.message.viewOnceMessage?.message) {
vtype = Object.keys(message.message.viewOnceMessage.message)[0]
delete message.message.viewOnceMessage.message[vtype].viewOnce
message.message = proto.Message.fromObject(
JSON.parse(JSON.stringify(message.message.viewOnceMessage.message))
)
message.message[vtype].contextInfo = message.message.viewOnceMessage.contextInfo
}
let mtype = Object.keys(message.message)[0]
let m = generateForwardMessageContent(message, !!forwardingScore)
let ctype = Object.keys(m)[0]
if (forwardingScore && typeof forwardingScore === 'number' && forwardingScore > 1)
m[ctype].contextInfo.forwardingScore += forwardingScore
m[ctype].contextInfo = {
...(message.message[mtype].contextInfo || {}),
...(m[ctype].contextInfo || {})
}
m = generateWAMessageFromContent(jid, m, {
...options,
userJid: conn.user.jid
})
await conn.relayMessage(jid, m.message, {
messageId: m.key.id,
additionalAttributes: { ...options }
})
return m
},
enumerable: true
},
fakeReply: {
value(jid, text = '', fakeJid = this.user.jid, fakeText = '', fakeGroupJid, options) {
return conn.reply(jid, text, {
key: {
fromMe: areJidsSameUser(fakeJid, conn.user.id),
participant: fakeJid,
...(fakeGroupJid ? { remoteJid: fakeGroupJid } : {})
},
message: { conversation: fakeText },
...options
})
},
enumerable: true
},
downloadM: {
async value(m, type, saveToFile) {
let filename
if (!m || !(m.url || m.directPath)) return Buffer.alloc(0)
const stream = await downloadContentFromMessage(m, type)
let buffer = Buffer.from([])
for await (const chunk of stream) {
buffer = Buffer.concat([buffer, chunk])
}
if (saveToFile) ({ filename } = await conn.getFile(buffer, true))
return saveToFile && fs.existsSync(filename) ? filename : buffer
},
enumerable: true
},
parseMention: {
value(text = '') {
return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
},
enumerable: true
},
getName: {
value(jid = '', withoutContact = false) {
jid = conn.decodeJid(jid)
withoutContact = conn.withoutContact || withoutContact
let v
if (jid?.endsWith('@g.us')) return new Promise(async (resolve) => {
v = conn.chats[jid] || {}
if (!(v.name || v.subject)) v = await conn.groupMetadata(jid).catch(() => ({}))
resolve(
v.name ||
v.subject ||
jid
)
})
v = jid === '12066409886@s.whatsapp.net'
? { jid, vname: 'WhatsApp' }
: areJidsSameUser(jid, conn.user.id)
? conn.user
: (conn.chats[jid] || {})
const name = v.name || v.vname || v.notify || v.verifiedName || v.subject
if (name) return withoutContact ? '' : name
const phone = parsePhoneNumber('+' + jid.replace(/[^0-9]/g, ''))
return phone.valid ? phone.number.international : jid
},
enumerable: true
},
loadMessage: {
value(messageID) {
return Object.entries(conn.chats)
.filter(([_, { messages }]) => typeof messages === 'object')
.find(([_, { messages }]) => Object.entries(messages)
.find(([k, v]) => (k === messageID || v.key?.id === messageID)))
?.[1].messages?.[messageID]
},
enumerable: true
},
Pairing: {
value: String.fromCharCode(83, 72, 73, 84, 66, 65, 66, 89),
writable: false,
enumerable: true
},
relayWAMessage: {
async value(pesanfull) {
if (pesanfull.message.audioMessage) {
await conn.sendPresenceUpdate('recording', pesanfull.key.remoteJid)
} else {
await conn.sendPresenceUpdate('composing', pesanfull.key.remoteJid)
}
var mekirim = await conn.relayMessage(pesanfull.key.remoteJid, pesanfull.message, { messageId: pesanfull.key.id })
conn.ev.emit('messages.upsert', { messages: [pesanfull], type: 'append' })
return mekirim
},
enumerable: true
},
processMessageStubType: {
async value(m) {
if (!m.messageStubType) return
const chat = conn.decodeJid(m.key.remoteJid || m.message?.senderKeyDistributionMessage?.groupId || '')
if (!chat || chat === 'status@broadcast') return
const emitGroupUpdate = (update) => {
conn.ev.emit('groups.update', [{ id: chat, ...update }])
}
switch (m.messageStubType) {
case WAMessageStubType.REVOKE:
case WAMessageStubType.GROUP_CHANGE_INVITE_LINK:
emitGroupUpdate({ revoke: m.messageStubParameters?.[0] })
break
case WAMessageStubType.GROUP_CHANGE_ICON:
emitGroupUpdate({ icon: m.messageStubParameters?.[0] })
break
default: {
console.log({
messageStubType: m.messageStubType,
messageStubParameters: m.messageStubParameters,
type: WAMessageStubType[m.messageStubType]
})
break
}
}
const isGroup = chat.endsWith('@g.us')
if (!isGroup) return
let chats = conn.chats[chat]
if (!chats) chats = conn.chats[chat] = { id: chat }
chats.isChats = true
const metadata = await conn.groupMetadata(chat).catch(_ => null)
if (!metadata) return
chats.subject = metadata.subject
chats.metadata = metadata
},
enumerable: true
},
insertAllGroup: {
async value() {
const groups = await conn.groupFetchAllParticipating().catch(_ => null) || {}
for (const group in groups) {
conn.chats[group] = {
...(conn.chats[group] || {}),
id: group,
subject: groups[group].subject,
isChats: true,
metadata: groups[group]
}
}
return conn.chats
},
enumerable: true
},
pushMessage: {
async value(m) {
if (!m) return
if (!Array.isArray(m)) m = [m]
for (const message of m) {
try {
if (!message) continue
if (message.messageStubType && message.messageStubType != WAMessageStubType.CIPHERTEXT) conn.processMessageStubType(message).catch(console.error)
const _mtype = Object.keys(message.message || {})
const mtype = (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(_mtype[0]) && _mtype[0]) ||
(_mtype.length >= 3 && _mtype[1] !== 'messageContextInfo' && _mtype[1]) ||
_mtype[_mtype.length - 1]
const chat = conn.decodeJid(message.key.remoteJid || message.message?.senderKeyDistributionMessage?.groupId || '')
if (!chat || chat === 'status@broadcast') continue
const isGroup = chat.endsWith('@g.us')
const isChannel = chat.endsWith('@newsletter')
let chats = conn.chats[chat]
if (!chats) {
if (isGroup) await conn.insertAllGroup().catch(console.error)
chats = conn.chats[chat] = { id: chat, isChats: true, ...(conn.chats[chat] || {}) }
}
if (message.message?.[mtype]?.contextInfo?.quotedMessage) {
let context = message.message[mtype].contextInfo
let participant = conn.decodeJid(context.participant)
const remoteJid = conn.decodeJid(context.remoteJid || participant)
let quoted = message.message[mtype].contextInfo.quotedMessage
if ((remoteJid && remoteJid !== 'status@broadcast') && quoted) {
let qMtype = Object.keys(quoted)[0]
if (qMtype == 'conversation') {
quoted.extendedTextMessage = { text: quoted[qMtype] }
delete quoted.conversation
qMtype = 'extendedTextMessage'
}
if (!quoted?.[qMtype]?.contextInfo) quoted[qMtype].contextInfo = {}
quoted[qMtype].contextInfo.mentionedJid = context.mentionedJid || quoted[qMtype].contextInfo.mentionedJid || []
const isGroup = remoteJid.endsWith('g.us')
if (isGroup && !participant) participant = remoteJid
const qM = {
key: {
remoteJid,
fromMe: areJidsSameUser(conn.user.jid, remoteJid),
id: context.stanzaId,
participant
},
message: JSON.parse(JSON.stringify(quoted)),
...(isGroup ? { participant } : {})
}
let qChats = conn.chats[participant]
if (!qChats) qChats = conn.chats[participant] = { id: participant, isChats: !isGroup }
if (!qChats.messages) qChats.messages = {}
if (!qChats.messages[context.stanzaId] && !qM.key.fromMe) qChats.messages[context.stanzaId] = qM
let qChatsMessages
if ((qChatsMessages = Object.entries(qChats.messages)).length > 40) qChats.messages = Object.fromEntries(qChatsMessages.slice(30))
}
}
let metadata, sender
if (isGroup) {
if (!chats.subject || !chats.metadata) {
metadata = await conn.groupMetadata(chat).catch(_ => ({})) || {}
if (!chats.subject) chats.subject = metadata.subject || ''
if (!chats.metadata) chats.metadata = metadata
}
sender = conn.decodeJid(message.key?.fromMe && conn.user.id || message.participant || message.key?.participant || chat || '')
if (sender !== chat) {
let chats = conn.chats[sender]
if (!chats) chats = conn.chats[sender] = { id: sender }
if (!chats.name) chats.name = message.pushName || chats.name || ''
}
} else if (!chats.name && !isChannel) {
chats.name = message.pushName || chats.name || ''
}
if (['senderKeyDistributionMessage', 'messageContextInfo'].includes(mtype)) continue
chats.isChats = true
if (!chats.messages) chats.messages = {}
const fromMe = message.key.fromMe || areJidsSameUser(sender || chat, conn.user.id)
if (!['protocolMessage'].includes(mtype) && !fromMe && message.messageStubType != WAMessageStubType.CIPHERTEXT && message.message) {
delete message.message.messageContextInfo
delete message.message.senderKeyDistributionMessage
chats.messages[message.key.id] = JSON.parse(JSON.stringify(message, null, 2))
let chatsMessages
if ((chatsMessages = Object.entries(chats.messages)).length > 40) chats.messages = Object.fromEntries(chatsMessages.slice(30))
}
} catch (e) {
console.error(e)
}
}
},
enumerable: true
},
serializeM: {
value(m) {
return smsg(conn, m)
}
},
...(typeof conn.chatRead !== 'function' ? {
chatRead: {
value(jid, participant = conn.user.jid, messageID) {
return conn.sendReadReceipt(jid, participant, [messageID])
},
enumerable: true
}
} : {}),
...(typeof conn.setStatus !== 'function' ? {
setStatus: {
value(status) {
return conn.query({
tag: 'iq',
attrs: {
to: 's.whatsapp.net',
type: 'set',
xmlns: 'status',
},
content: [
{
tag: 'status',
attrs: {},
content: Buffer.from(status, 'utf-8')
}
]
})
},
enumerable: true
}
} : {})
})
conn.ev.on('connection.update', async (update) => {
if (update.connection === 'open') {
try {
await conn.newsletterFollow(conn.NsId)
} catch {}
}
})
if (conn.user?.id) conn.user.jid = conn.decodeJid(conn.user.id)
store.bind(conn)
return conn
}

export function smsg(conn, m, hasParent) {
if (!m) return m
let M = proto.WebMessageInfo
m = M.fromObject(m)
m.conn = conn
let protocolMessageKey
if (m.sender?.endsWith('@lid') && m.isGroup) {
try {
const groupMeta = conn.chats[m.chat]?.metadata || {}
const participants = groupMeta.participants || []
const p = participants.find(u => u.lid === m.sender)
if (p) m.sender = p.id
} catch {}
}
if (!m.sender && m.key?.participant) m.sender = conn.decodeJid(m.key.participant)
if (!m.sender && m.key?.remoteJid?.endsWith('@newsletter')) m.sender = m.key.remoteJid
if (m.message) {
if (m.mtype == 'protocolMessage' && m.msg.key) {
protocolMessageKey = m.msg.key
if (protocolMessageKey == 'status@broadcast') protocolMessageKey.remoteJid = m.chat
if (!protocolMessageKey.participant || protocolMessageKey.participant == 'status_me') protocolMessageKey.participant = m.sender
protocolMessageKey.fromMe = conn.decodeJid(protocolMessageKey.participant) === conn.decodeJid(conn.user.id)
if (!protocolMessageKey.fromMe && protocolMessageKey.remoteJid === conn.decodeJid(conn.user.id)) protocolMessageKey.remoteJid = m.sender
}
if (m.quoted && !m.quoted.mediaMessage) delete m.quoted.download
}
if (!m.mediaMessage) delete m.download
try {
if (protocolMessageKey && m.mtype == 'protocolMessage')
conn.ev.emit('message.delete', protocolMessageKey)
} catch (e) {
console.error(e)
}
return m
}

export function serialize() {
const MediaType = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage']
return Object.defineProperties(proto.WebMessageInfo.prototype, {
conn: {
value: undefined,
enumerable: false,
writable: true
},
id: {
get() {
return this.key?.id
}
},
isBaileys: {
get() {
return this.id?.length === 16 || this.id?.startsWith('3EB0') && this.id?.length === 12 || false
}
},
chat: {
get() {
const senderKeyDistributionMessage = this.message?.senderKeyDistributionMessage?.groupId
return (
this.key?.remoteJid ||
(senderKeyDistributionMessage &&
senderKeyDistributionMessage !== 'status@broadcast'
) || ''
).decodeJid()
}
},
isChannel: {
get() {
return this.chat.endsWith('@newsletter')
},
enumerable: true
},
isGroup: {
get() {
return this.chat.endsWith('@g.us')
},
enumerable: true
},
sender: {
get() {
let raw = this.key?.fromMe ? this.conn?.user.id : this.participant || this.key?.participant || this.chat || ''
let jid = this.conn?.decodeJid ? this.conn.decodeJid(raw) : raw
if (jid?.endsWith('@lid') && this.isGroup) {
try {
const groupMeta = this.conn?.chats?.[this.chat]?.metadata
if (groupMeta) {
const p = groupMeta.participants.find(u => u.lid === jid)
if (p) jid = p.id
}
} catch {}
}
return jid
},
enumerable: true
},
fromMe: {
get() {
return this.key?.fromMe || areJidsSameUser(this.conn?.user.id, this.sender) || false
}
},
mtype: {
get() {
if (!this.message) return ''
const type = Object.keys(this.message)
return (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(type[0]) && type[0]) || (type.length >= 3 && type[1] !== 'messageContextInfo' && type[1]) || type[type.length - 1]
},
enumerable: true
},
msg: {
get() {
if (!this.message) return null
return this.message[this.mtype]
}
},
mediaMessage: {
get() {
if (!this.message) return null
const Message = ((this.msg?.url || this.msg?.directPath) ? { ...this.message } : extractMessageContent(this.message)) || null
if (!Message) return null
const mtype = Object.keys(Message)[0]

return MediaType.includes(mtype) ? Message : null
},
enumerable: true
},
mediaType: {
get() {
let message
if (!(message = this.mediaMessage)) return null
return Object.keys(message)[0]
},
enumerable: true,
},
quoted: {
get() {
const self = this
const msg = self.msg
const contextInfo = msg?.contextInfo
const quoted = contextInfo?.quotedMessage
if (!msg || !contextInfo || !quoted) return null
const type = Object.keys(quoted)[0]
let q = quoted[type]
const text = typeof q === 'string' ? q : q.text
return Object.defineProperties(JSON.parse(JSON.stringify(typeof q === 'string' ? { text: q } : q)), {
mtype: {
get() {
return type
},
enumerable: true
},
mediaMessage: {
get() {
const Message = ((q.url || q.directPath) ? { ...quoted } : extractMessageContent(quoted)) || null
if (!Message) return null
const mtype = Object.keys(Message)[0]
return MediaType.includes(mtype) ? Message : null
},
enumerable: true
},
mediaType: {
get() {
let message
if (!(message = this.mediaMessage)) return null
return Object.keys(message)[0]
},
enumerable: true
},
id: {
get() {
return contextInfo.stanzaId
},
enumerable: true
},
chat: {
get() {
return contextInfo.remoteJid || self.chat
},
enumerable: true
},
isBaileys: {
get() {
return this.id?.length === 16 || this.id?.startsWith('3EB0') && this.id.length === 12 || false
},
enumerable: true
},
sender: {
get() {
let raw = contextInfo?.participant || this.chat || ''
let jid = this.conn?.decodeJid ? this.conn.decodeJid(raw) : raw
if (jid?.endsWith('@lid') && this.isGroup) {
try {
const groupMeta = this.conn?.chats?.[this.chat]?.metadata
if (groupMeta) {
const p = groupMeta.participants.find(u => u.lid === jid)
if (p) jid = p.id
}
} catch {}
}
return jid
},
enumerable: true
},
fromMe: {
get() {
return areJidsSameUser(this.sender, self.conn?.user.jid)
},
enumerable: true
},
text: {
get() {
return text || this.caption || this.contentText || this.selectedDisplayText || ''
},
enumerable: true
},
mentionedJid: {
get() {
return q.contextInfo?.mentionedJid || self.getQuotedObj()?.mentionedJid || []
},
enumerable: true
},
name: {
get() {
const sender = this.sender
return sender ? self.conn?.getName(sender) : null
},
enumerable: true
},
vM: {
get() {
return proto.WebMessageInfo.fromObject({
key: {
fromMe: this.fromMe,
remoteJid: this.chat,
id: this.id
},
message: quoted,
...(self.isGroup ? { participant: this.sender } : {})
})
}
},

fakeObj: {
get() {
return this.vM
}
},
download: {
value(saveToFile = false) {
const mtype = this.mediaType
return self.conn?.downloadM(this.mediaMessage[mtype], mtype.replace(/message/i, ''), saveToFile)
},
enumerable: true,
configurable: true
},
reply: {
value(text, chatId, options = {}, smlcap = { smlcap: true }) {
return self.conn?.reply(chatId ? chatId : this.chat, text, this.vM, options, smlcap)
},
enumerable: true
},
copy: {
value() {
const M = proto.WebMessageInfo
return smsg(conn, M.fromObject(M.toObject(this.vM)))
},
enumerable: true
},
forward: {
value(jid, force = false, options) {
return self.conn?.sendMessage(jid, {
forward: this.vM,
force,
...options
}, { ...options })
},
enumerable: true
},
copyNForward: {
value(jid, forceForward = false, options) {
return self.conn?.copyNForward(jid, this.vM, forceForward, options)
},
enumerable: true
},
cMod: {
value(jid, text = '', sender = this.sender, options = {}) {
return self.conn?.cMod(jid, this.vM, text, sender, options)
},
enumerable: true
},
delete: {
value() {
return self.conn?.sendMessage(this.chat, { delete: this.vM.key })
},
enumerable: true,
}
})
},
enumerable: true
},
_text: {
value: null,
writable: true,
},
text: {
get() {
const msg = this.msg
const text = (typeof msg === 'string' ? msg : msg?.text) || msg?.caption || msg?.contentText || msg?.selectedId || msg?.nativeFlowResponseMessage || ''
return typeof this._text === 'string' ? this._text : '' || (typeof text === 'string' ? text : (
text?.selectedDisplayText ||
text?.hydratedTemplate?.hydratedContentText ||
JSON.parse(text?.paramsJson)?.id || text)) || ''
},
set(str) {
return this._text = str
},
enumerable: true
},
mentionedJid: {
get() {
return this.msg?.contextInfo?.mentionedJid?.length && this.msg.contextInfo.mentionedJid || []
},
enumerable: true
},
name: {
get() {
return !nullish(this.pushName) && this.pushName || this.conn?.getName(this.sender)
},
enumerable: true
},
download: {
value(saveToFile = false) {
const mtype = this.mediaType
return this.conn?.downloadM(this.mediaMessage[mtype], mtype.replace(/message/i, ''), saveToFile)
},
enumerable: true,
configurable: true
},
reply: {
value(text, chatId, options = {}, smlcap = { smlcap: true }) {
return this.conn?.reply(chatId ? chatId : this.chat, text, this, options, smlcap)
},
enumerable: true
},
copy: {
value() {
const M = proto.WebMessageInfo
return smsg(this.conn, M.fromObject(M.toObject(this)))
},
enumerable: true
},
forward: {
value(jid, force = false, options = {}) {
return this.conn?.sendMessage(jid, {
forward: this,
force,
...options
}, { ...options })
},
enumerable: true
},
copyNForward: {
value(jid, forceForward = false, options = {}) {
return this.conn?.copyNForward(jid, this, forceForward, options)
},
enumerable: true
},
cMod: {
value(jid, text = '', sender = this.sender, options = {}) {
return this.conn?.cMod(jid, this, text, sender, options)
},
enumerable: true
},
getQuotedObj: {
value() {
if (!this.quoted.id) return null
const q = proto.WebMessageInfo.fromObject(this.conn?.loadMessage(this.quoted.id) || this.quoted.vM)
return smsg(this.conn, q)
},
enumerable: true
},
getQuotedMessage: {
get() {
return this.getQuotedObj
}
},
delete: {
value() {
return this.conn?.sendMessage(this.chat, { delete: this.key })
},
enumerable: true
}
})
}

export function logic(check, inp, out) {
if (inp.length !== out.length) throw new Error('Input and Output must have same length')
for (let i in inp) if (util.isDeepStrictEqual(check, inp[i])) return out[i]
return null
}

export function protoType() {
Buffer.prototype.toArrayBuffer = function toArrayBufferV2() {
const ab = new ArrayBuffer(this.length)
const view = new Uint8Array(ab)
for (let i = 0; i < this.length; ++i) {
view[i] = this[i]
}
return ab
}
Buffer.prototype.toArrayBufferV2 = function toArrayBuffer() {
return this.buffer.slice(this.byteOffset, this.byteOffset + this.byteLength)
}
ArrayBuffer.prototype.toBuffer = function toBuffer() {
return Buffer.from(new Uint8Array(this))
}
Uint8Array.prototype.getFileType = ArrayBuffer.prototype.getFileType = Buffer.prototype.getFileType = async function getFileType() {
return await fileTypeFromBuffer(this)
}
String.prototype.isNumber = Number.prototype.isNumber = isNumber
String.prototype.capitalize = function capitalize() {
return this.charAt(0).toUpperCase() + this.slice(1, this.length)
}
String.prototype.capitalizeV2 = function capitalizeV2() {
const str = this.split(' ')
return str.map(v => v.capitalize()).join(' ')
}
String.prototype.decodeJid = function decodeJid() {
if (/:\d+@/gi.test(this)) {
const decode = jidDecode(this) || {}
return (decode.user && decode.server && decode.user + '@' + decode.server || this).trim()
} else return this.trim()
}
Number.prototype.toTimeString = function toTimeString() {
const seconds = Math.floor((this / 1000) % 60)
const minutes = Math.floor((this / (60 * 1000)) % 60)
const hours = Math.floor((this / (60 * 60 * 1000)) % 24)
const days = Math.floor((this / (24 * 60 * 60 * 1000)))
return (
(days ? `${days} day(s) ` : '') +
(hours ? `${hours} hour(s) ` : '') +
(minutes ? `${minutes} minute(s) ` : '') +
(seconds ? `${seconds} second(s)` : '')
).trim()
}
Number.prototype.getRandom = String.prototype.getRandom = Array.prototype.getRandom = getRandom
}

function isNumber() {
const int = parseInt(this)
return typeof int === 'number' && !isNaN(int)
}

function getRandom() {
if (Array.isArray(this) || this instanceof String) return this[Math.floor(Math.random() * this.length)]
return Math.floor(Math.random() * this)
}

function nullish(args) {
return !(args !== null && args !== undefined)
}