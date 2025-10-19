let handler = async (m, { conn, args }) => {
    try {
        const text = args[0];
        if (!text) return m.reply("Usage: .cekid <link grup / channel WhatsApp>");

        let url;
        try {
            url = new URL(text);
        } catch {
            return m.reply("Invalid link format.");
        }

        let isGroup =
            url.hostname === "chat.whatsapp.com" && /^\/[A-Za-z0-9]{20,}$/.test(url.pathname);
        let isChannel = url.hostname === "whatsapp.com" && url.pathname.startsWith("/channel/");
        let id, name, code;

        if (isGroup) {
            code = url.pathname.replace(/^\/+/, "");
            const res = await conn.groupGetInviteInfo(code);
            id = res.id;
            name = res.subject;
        } else if (isChannel) {
            code = url.pathname.split("/channel/")[1]?.split("/")[0];
            const res = await conn.newsletterMetadata("invite", code, "GUEST");
            id = res.id;
            name = res.name;
        } else {
            return m.reply("Unsupported link. Provide a valid group or channel link.");
        }

        const info = `\`\`\`
Name : ${name}
ID   : ${id}
────────────────────────
Use the button below to copy.
\`\`\``;

        await conn.sendMessage(
            m.chat,
            {
                text: info,
                title: "WhatsApp ID Checker",
                footer: "© Naruya Izumi 2025",
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Copy ID",
                            copy_code: id,
                        }),
                    },
                ],
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("Error: Unable to fetch information from the provided link.");
    }
};

handler.help = ["cekid"];
handler.tags = ["tools"];
handler.command = /^(cekid|id)$/i;

export default handler;
