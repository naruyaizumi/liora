let handler = async (m, { conn, args }) => {
    if (!args[0]) return m.reply("Enter a valid WhatsApp group or channel link.");

    try {
        const url = new URL(args[0]);
        const { hostname, pathname } = url;
        let id;

        if (hostname === "chat.whatsapp.com" && /^[A-Za-z0-9]{20,}$/.test(pathname.slice(1))) {
            const code = pathname.slice(1);
            const res = await conn.groupGetInviteInfo(code);
            id = res.id;
        } else if (hostname === "whatsapp.com" && pathname.startsWith("/channel/")) {
            const code = pathname.split("/channel/")[1]?.split("/")[0];
            const res = await conn.newsletterMetadata("invite", code, "GUEST");
            id = res.id;
        } else {
            throw new Error("Invalid link format.");
        }

        await m.reply(id);
    } catch (err) {
        console.error(err);
        return m.reply("Invalid or unsupported link. Unable to extract ID.");
    }
};

handler.help = ["cekid"];
handler.tags = ["tool"];
handler.command = /^(cekid|id)$/i;

export default handler;
