let handler = async (m, { conn, args }) => {
    try {
        const text = args[0]
        if (!text) return m.reply("Usage: .cekid <WhatsApp group or channel link>")

        let url
        try {
            url = new URL(text)
        } catch {
            return m.reply("Invalid link format.")
        }

        let isGroup =
            url.hostname === "chat.whatsapp.com" && /^\/[A-Za-z0-9]{20,}$/.test(url.pathname)
        let isChannel = url.hostname === "whatsapp.com" && url.pathname.startsWith("/channel/")
        let id, name, code

        if (isGroup) {
            code = url.pathname.replace(/^\/+/, "")
            const res = await conn.groupGetInviteInfo(code)
            id = res.id
            name = res.subject
        } else if (isChannel) {
            code = url.pathname.split("/channel/")[1]?.split("/")[0]
            const res = await conn.newsletterMetadata("invite", code, "GUEST")
            id = res.id
            name = res.name
        } else {
            return m.reply("Unsupported link. Provide a valid group or channel link.")
        }

        await m.reply(`Name: ${name}\nID: ${id}`)
    } catch (e) {
        console.error(e)
        await m.reply("Error: Unable to fetch information from the provided link.")
    }
}

handler.help = ["cekid"]
handler.tags = ["tools"]
handler.command = /^(cekid|id)$/i

export default handler