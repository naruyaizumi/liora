
let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text) return m.reply(`📦 *Contoh: ${usedPrefix + command} naruyaizumi baileys`)
await global.loading(m, conn)
try {
let res = await fetch(global.API('btz', '/api/stalk/repo', { repo: text }, 'apikey'))
if (!res.ok) throw '❌ Gagal mengakses API repositori.'
let json = await res.json()
if (!json.status || !json.result?.items?.length) throw '📁 *Repositori tidak ditemukan.*'
let repo = json.result.items[0]
let author = repo.author || {}
let caption = `
📁 *GITHUB REPOSITORY STALK*
👤 *Author: ${author.username}*
🧩 *Nama Repo: ${repo.nameRepo}*
🏷️ *Full Name: ${repo.fullNameRepo}*
📝 *Deskripsi: ${repo.description || '–'}*

⭐ *Stars: ${repo.stargazers}*
👀 *Watchers: ${repo.watchers}*
🍴 *Forks: ${repo.forks}*

🔀 *Default Branch: ${repo.defaultBranch}*
🔐 *Privat: ${repo.isPrivate ? 'Ya' : 'Tidak'}*
📦 *Fork: ${repo.isFork ? 'Ya' : 'Tidak'}*

🌐 *URL: ${repo.url_repo}*
📎 *Clone URL: ${repo.clone_url}*
🔗 *Homepage: ${repo.homepage || '–'}*

📅 *Dibuat: ${new Date(repo.createdAt).toLocaleDateString('id-ID')}*
🛠️ *Diupdate: ${new Date(repo.updatedAt).toLocaleDateString('id-ID')}*
🚀 *Push Terakhir: ${new Date(repo.pushedAt).toLocaleDateString('id-ID')}*
`.trim()
await conn.sendFile(m.chat, author.avatar_url, 'repo.jpg', caption, m)
} catch (e) {
console.error(e)
m.reply(typeof e === 'string' ? e : '🥀 *Gagal memuat info repositori.*')
} finally {
await global.loading(m, conn, true)
}
}

handler.help = ['stalkrepo']
handler.tags = ['tools']
handler.command = /^(stalkrepo|repostalk)$/i
handler.limit = true
handler.register = true

export default handler