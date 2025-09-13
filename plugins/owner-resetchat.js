
let handler = async (m) => {
let arr = Object.entries(db.data.chats)
.filter(([_, chat]) => typeof chat === 'object' && 'member' in chat)
.map(([id]) => id)
for (let id of arr) {
db.data.chats[id].member = {}
}
let users = db.data.users
let count = 0
for (let id in users) {
if (typeof users[id].chat !== 'undefined') {
users[id].chat = 0
count++
}
}
await m.reply(`🌸 *Sukses reset:*\n📂 *Data member dari ${arr.length} chat/grup*\n🧸 *Data chat harian dari ${count} user*`)
}

handler.help = ['resetchat']
handler.tags = ['owner']
handler.command = /^(resetchat)$/i
handler.owner = true

export default handler