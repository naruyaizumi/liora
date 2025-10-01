let handler = async (m, { conn, args }) => {
    if (!args[0]) {
        return m.reply("🍰 *Masukkan link grup atau saluran WhatsApp*")
    }

    try {
        const url = new URL(args[0])
        const { hostname, pathname } = url
        let id, name
        if (hostname === "chat.whatsapp.com" && /^[A-Za-z0-9]{20,}$/.test(pathname.slice(1))) {
            const code = pathname.slice(1)
            const res = await conn.groupGetInviteInfo(code)
            id = res.id
            name = res.subject
        } else if (hostname === "whatsapp.com" && pathname.startsWith("/channel/")) {
            const code = pathname.split("/channel/")[1]?.split("/")[0]
            const res = await conn.newsletterMetadata("invite", code, "GUEST")
            id = res.id
            name = res.name
        } else {
            throw new Error("invalid")
        }

        await conn.sendMessage(
            m.chat,
            {
                text: `🍬 *Informasi Ditemukan!*\n🍡 *Nama: ${name}*\n🍭 *ID: ${id}*`,
                footer: "",
                title: "🍧 CEK ID",
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Salin ID",
                            copy_code: id,
                        }),
                    },
                ],
            },
            { quoted: m }
        )
    } catch (e) {
        console.error(e)
        return m.reply("🧁 *Maaf, link tidak valid atau gagal mengambil data...*")
    }
}

handler.help = ["cekid"]
handler.tags = ["tool"]
handler.command = /^(cekid|id)$/i

export default handler