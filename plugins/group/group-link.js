let handler = async (m, { conn, groupMetadata }) => {
    try {
        let code = await conn.groupInviteCode(m.chat)
        let link = `https://chat.whatsapp.com/${code}`
        let teks = `🍡 *Nama Grup: ${groupMetadata.subject}*
🍰 *ID Grup: ${m.chat}*

🍬 *Link Undangan Grup: ${link}*`

        await conn.sendMessage(
            m.chat,
            {
                text: teks,
                footer: "",
                title: "🍧 LINK GRUP",
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Salin Link",
                            copy_code: link,
                        }),
                    },
                ],
            },
            { quoted: m }
        )
    } catch (e) {
        console.error(e)
        m.reply(
            "🍪 *Gagal mengambil link grup.*"
        )
    }
}

handler.help = ["grouplink"]
handler.tags = ["group"]
handler.command = /^(grouplink|link)$/i
handler.group = true
handler.botAdmin = true

export default handler