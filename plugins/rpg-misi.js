let handler = async (m, { conn, usedPrefix, command }) => {
await global.loading(m, conn)
let list = [
[".ojek", "1", "🛵 Ojek — Antar jemput penumpang sambil ngunyah permen~"],
[".polisi", "2", "👮 Polisi — Tangkap penjahat dan jaga keamanan kota"],
[".roket", "3", "🚀 Astronot — Misi luar angkasa mencari alien imut"],
[".taxy", "4", "🚖 Supir Taxy — Ngegas sampai penumpang muntah"],
[".pembunuh", "5", "🔪 Pembunuh Bayaran — Selesaikan targetmu diam-diam"],
[".youtuber", "6", "🎥 YouTuber — Bikin konten prank dan jadi viral"],
[".pilot", "7", "✈️ Pilot — Terbangkan pesawat dan hindari turbulensi"],
[".guru", "8", "📚 Guru — Mengajar sambil ngopi cantik di kelas"],
[".hacker", "9", "💻 Hacker — Bobol sistem bank buat dapet cuan"],
[".psk", "10", "💋 PSK — Peluk sana sini cari pelanggan kaya~"],
[".ninja", "11", "🥷 Ninja — Lari di atap buat nganter surat cinta"],
[".penyanyi", "12", "🎤 Penyanyi — Bawain lagu romantis di kafe malam"],
[".penjudi", "13", "🎲 Penjudi — Coba hoki mu di meja judi"],
[".pengacara", "14", "⚖️ Pengacara — Bela klien sampe bebas total"],
[".vlog", "15", "📸 Vlogger — Jalan-jalan sambil nge-vlog ala selebgram"],
[".spy", "16", "🕵️ Spy — Misi rahasia jadi mata-mata luar negeri"]
]
await conn.textList(m.chat, `🍡 *PILIH MISI RPG*`, false, list, m)
await global.loading(m, conn, true)
}

handler.help = ['misi']
handler.tags = ['rpg']
handler.command = /^(misi)$/i
handler.group = true
handler.register = true
handler.rpg = true

export default handler