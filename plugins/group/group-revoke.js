let handler = async (m, { conn }) => {
    try {
        let newCode = await conn.groupRevokeInvite(m.chat)
        let newLink = `https://chat.whatsapp.com/${newCode}`

        await conn.sendMessage(
            m.chat,
            {
                text: `🍓 *Link undangan grup berhasil di-reset!*`,
                title: "🍡 Grup Invite Link",
                footer: "📋 Klik tombol di bawah untuk menyalin link baru~",
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Salin Link Grup",
                            copy_code: newLink,
                        }),
                    },
                ],
            },
            { quoted: m }
        )
    } catch (e) {
        console.error(e)
        m.reply("🍩 *Gagal me-reset link grup. Coba lagi nanti yaa~*")
    }
}

handler.help = ["revoke"]
handler.tags = ["group"]
handler.command = /^(revoke)$/i
handler.group = true
handler.botAdmin = true
handler.admin = true

export default handler