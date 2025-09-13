
let handler = async (m, { conn, command }) => {
let isPublic = command === "public"
let self = global.opts["self"]

if (self === !isPublic)
return m.reply(
`🌸 *Udah ${!isPublic ? "Self" : "Public"} dari tadi ${m.sender.split("@")[0] === "6283143663697" ? "Cinta" : "Sayang"}*`
)
global.opts["self"] = !isPublic
m.reply(`🌸 *Berhasil ${!isPublic ? "Self" : "Public"} bot!*`)
}

handler.help = ["self", "public"]
handler.tags = ["owner"]
handler.command = /^(self|public)$/i
handler.owner = true

export default handler