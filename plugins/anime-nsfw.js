
let handler = async (m, { conn, usedPrefix, text, args, command }) => {

if (command == 'maid') {
let anu = await fetch('https://api.waifu.im/search?maid')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
if (command == 'waifu') {
let anu = await fetch('https://api.waifu.im/search?waifu')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
if (command == 'marin-kitagawa') {
let anu = await fetch('https://api.waifu.im/search?marin-kitagawa')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
if (command == 'mori-calliope') {
let anu = await fetch('https://api.waifu.im/search?mori-calliope')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
if (command == 'raiden-shogun') {
let anu = await fetch('https://api.waifu.im/search?raiden-shogun')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
if (command == 'oppai') {
let anu = await fetch('https://api.waifu.im/search?oppai')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
if (command == 'selfies') {
let anu = await fetch('https://api.waifu.im/search?selfies')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
if (command == 'uniform') {
let anu = await fetch('https://api.waifu.im/search?uniform')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
if (command == 'ashi') {
let anu = await fetch('https://api.waifu.im/search?ass')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
if (command == 'hentai') {
let anu = await fetch('https://api.waifu.im/search?hentai')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
if (command == 'milf') {
let anu = await fetch('https://api.waifu.im/search?milf')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
if (command == 'oral') {
let anu = await fetch('https://api.waifu.im/search?oral')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
if (command == 'paizuri') {
let anu = await fetch('https://api.waifu.im/search?paizuri')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
if (command == 'ecchi') {
let anu = await fetch('https://api.waifu.im/search?ecchi')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
if (command == 'ero') {
let anu = await fetch('https://api.waifu.im/search?ero')
let data = await anu.json()
let foto = data.images[0].url
data = data.images.map((v) => `*Signature:* ${v.signature}\n*Extension:* ${v.extension}\n*ID:* ${v.image_id}\n*Favorites:* ${v.favorites}\n*Color:* ${v.dominant_color}\n*Source:* ${v.source}\n*Artist:* ${v.artist}\n*Upload:* ${v.uploaded_at}\n*Like:* ${v.liked_at}\n*isNsfw:* ${v.is_nsfw}\n*Width:* ${v.width}\n*Height:* ${v.height}\n*Size:* ${v.byte_size}`)
conn.sendFile(m.chat, foto, 'anu.png', data, m)
}
}
handler.help = ['maid','waifu','marin-kitagawa','mori-calliope','raiden-shogun','oppai','selfies','uniform','ashi','hentai','milf','oral','paizuri','ecchi','ero']
handler.tags = ['anime']
handler.command = /^(maid|waifu|marin-kitagawa|mori-calliope|raiden-shogun|oppai|selfies|uniform|ashi|hentai|milf|oral|paizuri|ecchi|ero)$/i
handler.group = true
handler.register = true
handler.premium = true
export default handler