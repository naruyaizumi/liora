
const characters = [
["airi", "🎧 Airi"],
["akane", "🛡️ Akane"],
["akari", "💡 Akari"],
["ako", "🌸 Ako"],
["aris", "🔫 Aris"],
["arona", "📱 Arona"],
["aru", "💼 Aru"],
["asuna", "🍰 Asuna"],
["atsuko", "🧪 Atsuko"],
["ayane", "🍭 Ayane"],
["azusa", "❄️ Azusa"],
["cherino", "🐻 Cherino"],
["chihiro", "🧠 Chihiro"],
["chinatsu", "🌺 Chinatsu"],
["chise", "🔥 Chise"],
["eimi", "🎀 Eimi"],
["erica", "🗡️ Erica"],
["fubuki", "💨 Fubuki"],
["fuuka", "📖 Fuuka"],
["hanae", "🧁 Hanae"],
["hanako", "🌼 Hanako"],
["hare", "👓 Hare"],
["haruka", "🔨 Haruka"],
["haruna", "📚 Haruna"],
["hasumi", "🎯 Hasumi"],
["hibiki", "🎧 Hibiki"],
["hihumi", "💣 Hihumi"],
["himari", "🪻 Himari"],
["hina", "🏹 Hina"],
["hinata", "🕊️ Hinata"],
["hiyori", "🖌️ Hiyori"],
["hoshino", "🍔 Hoshino"],
["iori", "🔪 Iori"],
["iroha", "🎮 Iroha"],
["izumi", "🍓 Izumi"],
["izuna", "🌀 Izuna"],
["juri", "🛍️ Juri"],
["kaede", "🌱 Kaede"],
["karin", "🔭 Karin"],
["kayoko", "💣 Kayoko"],
["kazusa", "🧊 Kazusa"],
["kirino", "🪞 Kirino"],
["koharu", "🏥 Koharu"],
["kokona", "🍡 Kokona"],
["kotama", "🧷 Kotama"],
["kotori", "🎋 Kotori"],
["main", "🎉 Main"],
["maki", "📸 Maki"],
["mari", "🍬 Mari"],
["marina", "⚓ Marina"],
["mashiro", "🐈 Mashiro"],
["michiru", "🧃 Michiru"],
["midori", "🐇 Midori"],
["miku", "🎤 Miku"],
["mimori", "📓 Mimori"],
["misaki", "🎯 Misaki"],
["miyako", "🛏️ Miyako"],
["miyu", "📐 Miyu"],
["moe", "🧤 Moe"],
["momoi", "🍑 Momoi"],
["momoka", "🌷 Momoka"],
["mutsuki", "🎈 Mutsuki"],
["NP0013", "🤖 NP0013"],
["natsu", "🌞 Natsu"],
["neru", "🗡️ Neru"],
["noa", "🧿 Noa"],
["nodoka", "🧸 Nodoka"],
["nonomi", "🍞 Nonomi"],
["pina", "🎯 Pina"],
["rin", "🧾 Rin"],
["saki", "🔮 Saki"],
["saori", "🎱 Saori"],
["saya", "🍭 Saya"],
["sena", "📊 Sena"],
["serika", "🏃 Serika"],
["serina", "💊 Serina"],
["shigure", "🌧️ Shigure"],
["shimiko", "🧺 Shimiko"],
["shiroko", "🚴 Shiroko"],
["shizuko", "🧁 Shizuko"],
["shun", "🧷 Shun"],
["ShunBaby", "🍼 ShunBaby"],
["sora", "🌌 Sora"],
["sumire", "🌸 Sumire"],
["suzumi", "🧦 Suzumi"],
["tomoe", "🎎 Tomoe"],
["tsubaki", "🛡️ Tsubaki"],
["tsurugi", "⚰️ Tsurugi"],
["ui", "🧃 Ui"],
["utaha", "🎨 Utaha"],
["wakamo", "🦊 Wakamo"],
["yoshimi", "📷 Yoshimi"],
["yuuka", "💼 Yuuka"],
["yuzu", "🍋 Yuzu"],
["zunko", "🎼 Zunko"]
]

let speechQueue = {}
let handler = async (m, { conn, args, usedPrefix, command }) => {
try {
let userId = m.sender
if (!args[0]) return m.reply(`📢 *Masukkan teks untuk diubah ke suara!*\n\n*Contoh: ${usedPrefix + command} Semangat Izumi!*`)
let text = args.join(" ")
speechQueue[userId] = text
let list = characters.map((char, i) => [char[0], (i + 1).toString(), char[1]])
await conn.textList(m.chat, `🎙 *Pilih Karakter untuk Suara TTS*\n📌 *Teks: "${text}"*`, false, list, m)
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi Kesalahan Teknis!*\n⚠️ *Detail:* ${e.message}`)
}
}

handler.before = async (m, { conn }) => {
let userId = m.sender
if (!speechQueue[userId]) return
let character = m.text.trim().toLowerCase()
if (!characters.some(([id]) => id === character)) return
let text = speechQueue[userId]
delete speechQueue[userId]
await global.loading(m, conn)
try {
let apiUrl = `https://api.hiuraa.my.id/tools/ttsba?text=${text}&char=${character}&speed=1`
let response = await fetch(apiUrl)
if (!response.ok) throw new Error(await response.text())
let audio = Buffer.from(await response.arrayBuffer())
if (!audio || audio.length === 0) throw new Error("Buffer audio kosong!")
await conn.sendMessage(m.chat, { audio, mimetype: "audio/mpeg", ptt: true }, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ *Gagal membuat suara!*\n⚠️ *${e.message}*`)
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ["ttsba"]
handler.tags = ["tool"]
handler.command = /^ttsba$/i
handler.limit = true
handler.register = true

export default handler