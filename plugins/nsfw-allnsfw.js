
let handler = async (m, {command, conn}) => {
if (command == 'nsfwloli') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfwloli.json')
let data = await res.json()
let haha = data[Math.floor(data.length * Math.random())]
conn.sendMessage(m.chat, { image: { url: haha }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'nsfwfoot') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfwfoot.json')
let data = await res.json()
let haha = data[Math.floor(data.length * Math.random())]
conn.sendMessage(m.chat, { image: { url: haha }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'nsfwass') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfwass.json')
let data = await res.json()
let haha = data[Math.floor(data.length * Math.random())]
conn.sendMessage(m.chat, { image: { url: haha }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'nsfwbdsm') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfwbdsm.json')
let data = await res.json()
let haha = data[Math.floor(data.length * Math.random())]
conn.sendMessage(m.chat, { image: { url: haha }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'nsfwcum') {
let res = 'https://api.cafirexos.com/api/nsfw/nsfwcum'
conn.sendMessage(m.chat, { image: { url: res }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'nsfwero') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfwero.json').then(res => res.json())
let haha = res[Math.floor(Math.random() * res.length)]
conn.sendMessage(m.chat, { image: { url: haha }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'nsfwfemdom') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfwfemdom.json').then(res => res.json())
let haha = res[Math.floor(Math.random() * res.length)]
conn.sendMessage(m.chat, { image: { url: haha }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'nsfwglass') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfwglass.json').then(res => res.json())
let haha = res[Math.floor(Math.random() * res.length)]
conn.sendMessage(m.chat, { image: { url: haha }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'hentai') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/hentai.json').then(res => res.json())
let haha = res[Math.floor(Math.random() * res.length)]
conn.sendMessage(m.chat, { image: { url: haha }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'nsfworgy') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/nsfworgy.json').then(res => res.json())
let haha = res[Math.floor(Math.random() * res.length)]
conn.sendMessage(m.chat, { image: { url: haha }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'tetas') {
let resError = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/tetas.json').then(res => res.json())
let res = (await conn.getFile('https://api-fgmods.ddns.net/api/nsfw/boobs?apikey=fg-dylux')).data
if (!res) res = resError[Math.floor(Math.random() * resError.length)]
conn.sendMessage(m.chat, { image: { url: res }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'booty') {
let resError = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/booty.json').then(res => res.json())
let res = (await conn.getFile('https://api-fgmods.ddns.net/api/nsfw/ass?apikey=fg-dylux')).data
if (!res) res = resError[Math.floor(Math.random() * resError.length)]
conn.sendMessage(m.chat, { image: { url: res }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'ecchi') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/ecchi.json').then(res => res.json())
let url = res[Math.floor(Math.random() * res.length)]
conn.sendMessage(m.chat, { image: { url }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'furro') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/furro.json').then(res => res.json())
let url = res[Math.floor(Math.random() * res.length)]
conn.sendMessage(m.chat, { image: { url }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'trapito') {
let res = await fetch('https://api.waifu.pics/nsfw/trap').then(res => res.json())
let url = res.url
conn.sendMessage(m.chat, { image: { url }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'imagenlesbians') {
let resError = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/imagenlesbians.json').then(res => res.json())
let res = (await conn.getFile('https://api-fgmods.ddns.net/api/nsfw/lesbian?apikey=fg-dylux')).data
if (!res) res = resError[Math.floor(Math.random() * resError.length)]
conn.sendMessage(m.chat, { image: { url: res }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'panties') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/panties.json').then(res => res.json())
let url = res[Math.floor(Math.random() * res.length)]
conn.sendMessage(m.chat, { image: { url }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'pene') {
let resError = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/pene.json').then(res => res.json())
let res = (await conn.getFile('https://api-fgmods.ddns.net/api/nsfw/penis?apikey=fg-dylux')).data
if (!res) res = resError[Math.floor(Math.random() * resError.length)]
conn.sendMessage(m.chat, { image: { url: res }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'porno') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/porno.json').then(res => res.json())
let url = res[Math.floor(Math.random() * res.length)]
conn.sendMessage(m.chat, { image: { url }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'randomxxx') {
let jsonList = [
'https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/tetas.json',
'https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/booty.json',
'https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/imagenlesbians.json',
'https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/panties.json',
'https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/porno.json'
]
let pickedJson = jsonList[Math.floor(Math.random() * jsonList.length)]
let res = await fetch(pickedJson).then(res => res.json())
let url = res[Math.floor(Math.random() * res.length)]
conn.sendMessage(m.chat, { image: { url }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'pechos') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/pechos.json').then(res => res.json())
let url = res[Math.floor(Math.random() * res.length)]
conn.sendMessage(m.chat, { image: { url }, caption: `*${command}*`.trim() }, { quoted: m })
}
if (command == 'yaoi') {
let res = await fetch('https://nekobot.xyz/api/image?type=yaoi')
let json = await res.json()
let url = json.message
conn.sendMessage(m.chat, { image: { url }, caption: `*${command}*`.trim() }, { quoted: m })
}

if (command == 'yaoi2') {
let res = await fetch('https://purrbot.site/api/img/nsfw/yaoi/gif')
let json = await res.json()
let url = json.link
conn.sendMessage(m.chat, { image: { url }, caption: `*${command}*`.trim() }, { quoted: m })
}

if (command == 'yuri') {
let res = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/yuri.json').then(res => res.json())
let url = res[Math.floor(Math.random() * res.length)]
conn.sendMessage(m.chat, { image: { url }, caption: `*${command}*`.trim() }, { quoted: m })
}

if (command == 'yuri2') {
let resError = await fetch('https://raw.githubusercontent.com/BrunoSobrino/TheMystic-Bot-MD/master/src/JSON/yuri.json').then(res => res.json())
let res = await fetch('https://purrbot.site/api/img/nsfw/yuri/gif')
let json = await res.json()
let url = json.link
if (!url) url = resError[Math.floor(Math.random() * resError.length)]
conn.sendMessage(m.chat, { image: { url }, caption: `*${command}*`.trim() }, { quoted: m })
}
}
handler.help = ['nsfwloli', 'nsfwfoot', 'nsfwass', 'nsfwbdsm', 'nsfwcum', 'nsfwero', 'nsfwfemdom', 'nsfwfoot', 'nsfwglass', 'nsfworgy', 'nsfwyuri', 'nsfwyuri2', 'nsfwyaoi', 'nsfwyaoi2', 'nsfwpanties', 'nsfwtetas', 'nsfwbooty', 'nsfwecchi', 'nsfwfurro', 'nsfwhentai', 'nsfwtrapito', 'nsfwimagenlesbians', 'nsfwpene', 'nsfwporno', 'nsfwrandomxxx', 'nsfwpechos'];
handler.command = ['nsfwloli', 'nsfwfoot', 'nsfwass', 'nsfwbdsm', 'nsfwcum', 'nsfwero', 'nsfwfemdom', 'nsfwfoot', 'nsfwglass', 'nsfworgy', 'nsfwyuri', 'nsfwyuri2', 'nsfwyaoi', 'nsfwyaoi2', 'nsfwpanties', 'nsfwtetas', 'nsfwbooty', 'nsfwecchi', 'nsfwfurro', 'nsfwhentai', 'nsfwtrapito', 'nsfwimagenlesbians', 'nsfwpene', 'nsfwporno', 'nsfwrandomxxx', 'nsfwpechos']
handler.tags = ['nsfw']
handler.premium = true
handler.register = true
handler.nsfw = true
handler.age = 18

export default handler