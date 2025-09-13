
let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text) return m.reply(`📦 *Contoh: ${usedPrefix + command} naruyaizumi*`)
await global.loading(m, conn)
try {
let res = await fetch(global.API('btz', '/api/stalk/github', { username: text }, 'apikey'))
if (!res.ok) throw '❌ *Gagal mengakses API GitHub.*'
let json = await res.json()
if (!json.status || !json.result?.user) throw '🕵️‍♂️ *Akun GitHub tidak ditemukan.*'
let u = json.result.user
let caption = `
🐙 *GITHUB STALKER*
👤 *Nama: ${u.name || '-'}*
🏷️ *Username: @${u.username}*
🧩 *ID Pengguna: ${u.idUser}*
📌 *Bio: ${u.bio || '–'}*

📂 *Repositori Publik: ${u.publicRepos}*
📜 *Gist Publik: ${u.publicGists}*
👥 *Pengikut: ${u.followers}*
🔗 *Mengikuti: ${u.following}*

🗓️ *Dibuat: ${new Date(u.createdAt).toLocaleDateString('id-ID')}*
🛠️ *Update Terakhir* ${new Date(u.updatedAt).toLocaleDateString('id-ID')}*
🌐 *URL GitHub: ${u.githubUrl}*
🏢 *Perusahaan: ${u.company || '–'}*
🔗 *Blog/Web: ${u.blog || '–'}*
`.trim()
await conn.sendFile(m.chat, u.avatarUrl, 'github.jpg', caption, m)
} catch (e) {
console.error(e)
m.reply(typeof e === 'string' ? e : '🥀 *Gagal memuat informasi GitHub.*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['stalkgh']
handler.tags = ['tools']
handler.command = /^(stalkgh|ghstalk)$/i
handler.limit = true
handler.register = true

export default handler