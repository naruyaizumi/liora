import { Sticker } from 'wa-sticker-js'
import * as crypto from 'crypto'
import webp from 'node-webpmux'

async function sticker(img, url, packName, authorName) {
try {
let buffer = await (new Sticker(img || url, { type: 'full' })).toBuffer()
const imgWebp = new webp.Image()
await imgWebp.load(buffer)
const stickerPackId = crypto.randomBytes(32).toString('hex')
const json = {
'sticker-pack-id': stickerPackId,
'sticker-pack-name': packName,
'sticker-pack-publisher': authorName,
'emojis': []
}
let exifAttr = Buffer.from([
0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,
0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,
0x00,0x00,0x16,0x00,0x00,0x00
])
const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
const exif = Buffer.concat([exifAttr, jsonBuffer])
exif.writeUIntLE(jsonBuffer.length, 14, 4)
imgWebp.exif = exif
return await imgWebp.save(null)
} catch (error) {
throw new Error(`❌ Gagal membuat stiker: ${error.message}`)
}
}

async function addExif(buffer, packname, author, categories = []) {
const img = new webp.Image()
await img.load(buffer)
const stickerPackId = crypto.randomBytes(32).toString('hex')
const json = {
'sticker-pack-id': stickerPackId,
'sticker-pack-name': packname,
'sticker-pack-publisher': author,
'emojis': categories
}
const exifAttr = Buffer.from([0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00])
const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf-8')
const exif = Buffer.concat([exifAttr, jsonBuffer])
exif.writeUIntLE(jsonBuffer.length, 14, 4)
img.exif = exif
return await img.save(null)
}

async function mp4ToWebp(file, stickerMetadata) {
let getBase64 = file.toString('base64')
const Format = {
file: `data:video/mp4;base64,${getBase64}`,
processOptions: {
crop: stickerMetadata?.crop,
startTime: '00:00:00.0',
endTime: '00:00:30.0',
loop: 0
},
stickerMetadata: {
...stickerMetadata
},
sessionInfo: {
WA_VERSION: '2.2106.5',
PAGE_UA: 'WhatsApp/2.2037.6 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36',
WA_AUTOMATE_VERSION: '3.6.10 UPDATE AVAILABLE: 3.6.11',
BROWSER_VERSION: 'HeadlessChrome/88.0.4324.190',
OS: 'Windows Server 2016',
START_TS: 1614310326309,
NUM: '6247',
LAUNCH_TIME_MS: 7934,
PHONE_VERSION: '2.20.205.16'
},
config: {
sessionId: 'session',
headless: true,
qrTimeout: 20,
authTimeout: 0,
cacheEnabled: false,
useChrome: true,
killProcessOnBrowserClose: true,
throwErrorOnTosBlock: false,
chromiumArgs: [
'--no-sandbox',
'--disable-setuid-sandbox',
'--aggressive-cache-discard',
'--disable-cache',
'--disable-application-cache',
'--disable-offline-load-stale-cache',
'--disk-cache-size=0'
],
executablePath: 'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
skipBrokenMethodsCheck: true,
stickerServerEndpoint: true
}
}
let res = await fetch('https://sticker-api.openwa.dev/convertMp4BufferToWebpDataUrl', {
method: 'post',
headers: {
Accept: 'application/json, text/plain, /',
'Content-Type': 'application/json;charset=utf-8',
},
body: JSON.stringify(Format)
})
return Buffer.from((await res.text()).split(';base64,')[1], 'base64')
}

async function fakechat(text, name, avatar, url = false, isHD = false) {
let body = {
"type": "quote",
"format": "png",
"backgroundColor": "#FFFFFF",
"width": isHD ? 1024 : 512,
"height": isHD ? 1536 : 768,
"scale": isHD ? 4 : 2,
"messages": [{
"entities": [],
"media": url ? { "url": url } : null,
"avatar": true,
"from": {
"id": 1,
"name": name,
"photo": {
"url": avatar
}
},
"text": text,
"replyMessage": {}
}]
}
let response = await fetch('https://btzqc.betabotz.eu.org/generate', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(body)
})

if (!response.ok) throw new Error(`HTTP Error ${response.status}`)
let { result } = await response.json()
return Buffer.from(result.image, "base64")
}

export { sticker, addExif, mp4ToWebp, fakechat }