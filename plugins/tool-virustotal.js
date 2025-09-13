let handler = async (m, { conn, text, usedPrefix, command }) => {
try {
if (!text) return m.reply(`🔍 *Cek Keamanan URL dengan VirusTotal*\n\n📌 *Cara Penggunaan: ${usedPrefix + command} https://example.com*`)
let apiKey = "3898c42bbcab81717df3652eb5b769177b96a0a1902026ac3091f5068a440b96"
let url = encodeURIComponent(text.trim())
let scanResponse = await fetch("https://www.virustotal.com/api/v3/urls", {
method: "POST",
headers: {
"Content-Type": "application/x-www-form-urlencoded",
"x-apikey": apiKey
},
body: `url=${url}`
})
let scanData = await scanResponse.json()
if (!scanResponse.ok) return m.reply(`❌ *Gagal mengirim URL ke VirusTotal!*`)
let scanId = scanData.data.id
await new Promise(resolve => setTimeout(resolve, 10000))
let reportResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${scanId}`, {
headers: { "x-apikey": apiKey }
})
let report = await reportResponse.json()
if (!reportResponse.ok) return m.reply(`❌ *Gagal mengambil hasil analisis!*`)
let attributes = report.data.attributes
let engines = attributes.results
let harmless = attributes.stats.harmless || 0
let suspicious = attributes.stats.suspicious || 0
let malicious = attributes.stats.malicious || 0
let undetected = attributes.stats.undetected || 0
let scanDate = new Date(attributes.date * 1000).toLocaleString()
let scanDetails = Object.entries(engines).map(([engine, result]) => {
let status = result.category === "malicious" ? `Berbahaya: ${result.result}` :
result.category === "suspicious" ? `Mencurigakan: ${result.result}` :
result.category === "harmless" ? "Aman" : "Tidak Diketahui"
return `*• ${engine} : ${status}*`
}).join("\n")
let resultMessage = `
🔎 *Analisis Keamanan URL*
━━━━━━━━━━━━━━━━━━━━
🌐 *URL: ${text}*
📅 *Waktu Analisis: ${scanDate}*
━━━━━━━━━━━━━━━━━━━━
📡 *Aman: ${harmless}*
⚠️ *Mencurigakan: ${suspicious}*
☠️ *Berbahaya: ${malicious}*
🫧 *Tidak Terdeteksi: ${undetected}*
━━━━━━━━━━━━━━━━━━━━
📊 *Hasil Analisis oleh Mesin Keamanan:*
${scanDetails}`
await conn.sendMessage(m.chat, {
text: resultMessage
}, { quoted: m })
} catch (e) {
console.error(e)
m.reply(`❌ *Terjadi Kesalahan Teknis!*\n⚠️ *Detail:* ${e.message}`)
}
}

handler.help = ["scan"]
handler.tags = ["tools"]
handler.command = /^(scan|urlscan)$/i
handler.premium = false
handler.register = true

export default handler