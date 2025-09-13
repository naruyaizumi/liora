
let timeout = 60000
let poin = 1500

let handler = async (m, { conn }) => {
let abbreviations = [
{ short: "YTTA", full: "Yang Tau Tau Aja" },
{ short: "YNTKTS", full: "Yo Nda Tau Ko Tanya Saya" },
{ short: "IDK", full: "I Don't Know" },
{ short: "NVM", full: "Never Mind" },
{ short: "LOL", full: "Laugh Out Loud" },
{ short: "BTW", full: "By The Way" },
{ short: "OTW", full: "On The Way" },
{ short: "AFK", full: "Away From Keyboard" },
{ short: "ASAP", full: "As Soon As Possible" },
{ short: "CMIIW", full: "Correct Me If I'm Wrong" },
{ short: "GG", full: "Good Game" },
{ short: "IMO", full: "In My Opinion" },
{ short: "OMG", full: "Oh My God" },
{ short: "TBH", full: "To Be Honest" },
{ short: "FYI", full: "For Your Information" },
{ short: "DIY", full: "Do It Yourself" },
{ short: "AMA", full: "Ask Me Anything" },
{ short: "TLDR", full: "Too Long Didn't Read" },
{ short: "SMH", full: "Shaking My Head" },
{ short: "IKR", full: "I Know Right" },
{ short: "TTYL", full: "Talk To You Later" },
{ short: "HMU", full: "Hit Me Up" },
{ short: "WDYM", full: "What Do You Mean" },
{ short: "BRB", full: "Be Right Back" },
{ short: "LMAO", full: "Laughing My Ass Off" },
{ short: "ROFL", full: "Rolling On the Floor Laughing" },
{ short: "IDC", full: "I Don't Care" },
{ short: "ILY", full: "I Love You" },
{ short: "IMY", full: "I Miss You" },
{ short: "YOLO", full: "You Only Live Once" },
{ short: "FOMO", full: "Fear Of Missing Out" },
{ short: "TMI", full: "Too Much Information" },
{ short: "JK", full: "Just Kidding" },
{ short: "ICYMI", full: "In Case You Missed It" },
{ short: "BTS", full: "Behind The Scenes" },
{ short: "OOTD", full: "Outfit Of The Day" },
{ short: "NSFW", full: "Not Safe For Work" },
{ short: "WYD", full: "What You Doing" },
{ short: "GTG", full: "Got To Go" },
{ short: "LDR", full: "Long Distance Relationship" },
{ short: "MIA", full: "Missing In Action" },
{ short: "NGL", full: "Not Gonna Lie" },
{ short: "RN", full: "Right Now" },
{ short: "GWS", full: "Get Well Soon" },
{ short: "OTR", full: "On The Road" },
{ short: "PC", full: "Personal Chat" },
{ short: "VC", full: "Voice Call" },
{ short: "SC", full: "Script" },
{ short: "GC", full: "Group Chat" },
{ short: "PM", full: "Private Message" },
{ short: "TC", full: "Test Contact" },
{ short: "CW", full: "Content Warning" },
{ short: "OOT", full: "Out Of Topic" },
{ short: "TS", full: "Thread Starter" },
{ short: "RL", full: "Real Life" },
{ short: "IRL", full: "In Real Life" },
{ short: "OC", full: "Original Character" },
{ short: "NG", full: "No Good" },
{ short: "HR", full: "Hari Raya" },
{ short: "TTM", full: "Teman Tapi Mesra" },
{ short: "PHP", full: "Pemberi Harapan Palsu" },
{ short: "BAPER", full: "Bawa Perasaan" },
{ short: "KEPO", full: "Knowing Every Particular Object" },
{ short: "GABUT", full: "Gaji Buta" },
{ short: "MAGER", full: "Malas Gerak" },
{ short: "SOKAB", full: "Sok Akrab" },
{ short: "LEBAY", full: "Lebih Baya" },
{ short: "CURCOL", full: "Curhat Colongan" }
]
let randomAbbr = abbreviations[Math.floor(Math.random() * abbreviations.length)]
conn.tebaksingkatan = conn.tebaksingkatan || {}
let id = m.chat
if (id in conn.tebaksingkatan)
return conn.reply(m.chat, '🍩 *Masih ada tebakan singkatan berjalan di sini~ tunggu sampai selesai ya* 🍪', conn.tebaksingkatan[id][0])
let quoted = await conn.reply(m.chat,
`🍓 *TEBAK SINGKATAN* 🍓

🍰 *Singkatan: ${randomAbbr.short}*

🧁 *Cara main: Tebak kepanjangan dari singkatan di atas*
*Balas pesan ini dengan jawabanmu* 🍮
⏱️ *Waktu: ${timeout / 1000} detik*
🍫 *Tips: Tidak harus 100% tepat, yang mirip pun bisa* 🍭`,
m)
let timeoutID = setTimeout(() => {
if (conn.tebaksingkatan[id]) {
conn.reply(m.chat,
`⏰ *Waktu habis!* 🍦\n\n🍬 *Singkatan: ${randomAbbr.short}*\n🍫 *Jawaban: ${randomAbbr.full}*`,
conn.tebaksingkatan[id][0])
delete conn.tebaksingkatan[id]
}
}, timeout)

conn.tebaksingkatan[id] = [
quoted,
{ answer: randomAbbr.full, original: randomAbbr },
timeoutID,
poin,
3
]
}

handler.help = ['tebaksingkatan']
handler.tags = ['game']
handler.command = /^(tebaksingkatan|tebaksingkat)$/i
handler.register = true
handler.limit = true
handler.group = true

export default handler