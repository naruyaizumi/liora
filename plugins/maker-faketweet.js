
import * as dayCanvas from 'day-canvas'
const Tweet = dayCanvas.Tweet

let handler = async (m, { conn, text, usedPrefix, command }) => {
if (!text) return m.reply(`📝 *Contoh: ${usedPrefix + command} username|Nama Tampilan|Isi tweet*`)
let [username, displayName, ...tweetMsg] = text.split('|')
if (!username || !displayName || !tweetMsg.length) return m.reply(`✍️ Format salah!\n*Contoh:* ${usedPrefix + command} fivesobes|Beş|This is a tweet with #Canvafy`)
let pp = await conn.profilePictureUrl(m.sender, 'image').catch(_ => 'https://telegra.ph/file/2f1fd7c3fa620443c1635.jpg')
let tweet = await new Tweet()
.setTheme("dim")
.setUser({ displayName: displayName.trim(), username: username.trim() })
.setVerified(true)
.setComment(tweetMsg.join('|').trim())
.setAvatar(pp)
.build()
await conn.sendFile(m.chat, tweet, 'faketweet.png', '📱 *Fake Tweet berhasil dibuat!*', m)
}

handler.help = ['faketweet']
handler.tags = ['maker']
handler.command = /^faketweet$/i
handler.register = true
handler.limit = true

export default handler