let handler = async (m, { conn, args, usedPrefix }) => {
    try {
        const text = args[0];
        if (!text) return m.reply(`Usage: ${usedPrefix}cekid <link grup / channel WhatsApp>`);

        let url;
        try {
            url = new URL(text);
        } catch {
            return m.reply("Invalid link format.");
        }

        let isGroup =
            url.hostname === "chat.whatsapp.com" && /^\/[A-Za-z0-9]{20,}$/.test(url.pathname);
        let isChannel = url.hostname === "whatsapp.com" && url.pathname.startsWith("/channel/");
        let id;

        if (isGroup) {
            const code = url.pathname.replace(/^\/+/, "");
            const res = await conn.groupGetInviteInfo(code);
            id = res.id;
        } else if (isChannel) {
            const code = url.pathname.split("/channel/")[1]?.split("/")[0];
            const res = await conn.newsletterMetadata("invite", code, "GUEST");
            id = res.id;
        } else {
            return m.reply("Unsupported link. Provide a valid group or channel link.");
        }

        m.reply(id);
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["cekid"];
handler.tags = ["tools"];
handler.command = /^(cekid|id)$/i;

export default handler;