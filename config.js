/*
 * Liora WhatsApp Bot
 * @description Open source WhatsApp bot based on Node.js and Baileys.
 * @author      གྷ 𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊 <https://linkbio.co/naruyaizumi>
 * @co-author   གྷ 𝑺𝑿𝒁𝒏𝒊𝒈𝒉𝒕𝒎𝒂𝒓 <wa.me/6281398961382>
 * @co-author   གྷ 𝑹𝒚𝒐 𝑨𝒌𝒊𝒓𝒂 <wa.me/6289665362039>
 * @copyright   © 2024 - 2025 Naruya Izumi
 * @license     Apache License 2.0
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions
 * and limitations under the License.
 */

import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

global.config = {
    /*============== STAFF ==============*/
owner: [
['31629155460', '𝑵𝒂𝒓𝒖𝒚𝒂 𝑰𝒛𝒖𝒎𝒊', true],
['', '𝑺𝑿𝒁𝒏𝒊𝒈𝒉𝒕𝒎𝒂𝒓', true], // true: Mods
['', '𝑹𝒚𝒐 𝑨𝒌𝒊𝒓𝒂', false] // false: owner
],
jids: [
"@g.us", // tag status WhatsApp
"@g.us"
],
newsletter: '@newsletter',
website: 'https://linkbio.co/naruyaizumi',
group: 'https://',
logo: "https://",
    /*============= PAIRING =============*/
pairingNumber: '123456',
pairingAuth: true,
multiAuth: true,
    /*============== API ==============*/
APIs: {
lol: 'https://api.lolhuman.xyz',
btz: 'https://api.betabotz.eu.org',
},
APIKeys: {
'https://api.lolhuman.xyz': 'API_KEY',
'https://api.betabotz.eu.org': 'API_KEY'
},
domain: 'https://', // link panel pterodactyl
apikey: 'ptla_', // Admin Key
capikey: 'ptlc_', // CAdmin Key
nestid: '-', // Nest ID pterodactyl
egg: '-', // EGG ID pterodactyl
loc: '1', // location pterodactyl
VPS: {
host: '123.456', // IP VPS
port: '22', // open port
username: 'root', // access
password: '-', // password VPS
},
token: 'TOKEN', // token digital ocean
qris: '', // decode Qris
    /*============= SUBDOMAIN =============*/
Subdo: {
"naruyaizumi.site": {
zone: "",
apitoken: ""
}
},
    /*============== MSG ==============*/
watermark: '𝙇͢𝙞𝙤𝙧𝙖',
author: '𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞',
errorMsg: '*⚠️ Terjadi kesalahan sistem.*',
stickpack: '𝙇͢𝙞𝙤𝙧𝙖',
stickauth: '© 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞',
}
global.loading = async (m, conn, back = false) => {
if (!back) {
return conn.sendReact(m.chat, "🍥", m.key)
} else {
return conn.sendReact(m.chat, "", m.key)
}
}
/*============== EMOJI ==============*/
global.rpg = {
emoticon(string) {
string = string.toLowerCase()
let emot = {
level: '📊',
limit: '🎫',
health: '❤️',
exp: '✨',
atm: '💳',
money: '💰',
bank: '🏦',
potion: '🥤',
diamond: '💎',
common: '📦',
uncommon: '🛍️',
mythic: '🎁',
legendary: '🗃️',
superior: '💼',
pet: '🔖',
trash: '🗑',
armor: '🥼',
sword: '⚔️',
pickaxe: '⛏️',
fishingrod: '🎣',
wood: '🪵',
rock: '🪨',
string: '🕸️',
horse: '🐴',
cat: '🐱',
dog: '🐶',
fox: '🦊',
robo: '🤖',
dragon: '🐉',
lion: '🦁',
rhinoceros: '🦏',
centaur: '🦄',
scorpion: '🦂',
griffin: '🦅',
phoenix: '🐦‍🔥',
wolf: '🐺',
petfood: '🍖',
iron: '⛓️',
gold: '🪙',
emerald: '❇️',
upgrader: '🧰',
bibitanggur: '🌱',
bibitjeruk: '🌿',
bibitapel: '☘️',
bibitmangga: '🍀',
bibitpisang: '🌴',
anggur: '🍇',
jeruk: '🍊',
apel: '🍎',
mangga: '🥭',
pisang: '🍌',
botol: '🍾',
kardus: '📦',
kaleng: '🏮',
plastik: '📜',
gelas: '🧋',
chip: '♋',
umpan: '🪱',
skata: '🧩',
bitcoin: '☸️',
polygon: '☪️',
dogecoin: '☯️',
etherium: '⚛️',
solana: '✡️',
memecoin: '☮️',
donasi: '💸',
ammn: '⚖️',
bbca: '💵',
bbni: '💴',
cuan: '💷',
bbri: '💶',
msti: '📡',
steak: '🥩',
ayam_goreng: '🍗',
ribs: '🍖',
roti: '🍞',
udang_goreng: '🍤',
bacon: '🥓',
gandum: '🌾',
minyak: '🥃',
garam: '🧂',
babi: '🐖',
ayam: '🐓',
sapi: '🐮',
udang: '🦐'
}
if (typeof emot[string] !== 'undefined') {
return emot[string]
} else {
return ''
}
}
}

let file = global.__filename(import.meta.url)
watchFile(file, () => {
console.log(chalk.cyan.bold("⚡ Update 'config.js' terdeteksi!"))
})