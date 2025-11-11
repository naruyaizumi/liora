let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        const code = args.join(" ");
        if (!code)
            return m.reply(
                `Please enter some code.\n› Example: ${usedPrefix + command} conn.logger.info("Hello World");`
            );

        await global.loading(m, conn);

        const api = `https://api.nekolabs.web.id/canvas/carbonify?code=${encodeURIComponent(code)}`;
        const res = await fetch(api);
        if (!res.ok) throw new Error("Failed to contact Carbon API.");

        const buffer = Buffer.from(await res.arrayBuffer());

        await conn.sendMessage(
            m.chat,
            { image: buffer, caption: "Carbon-style code snippet." },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["carbon"];
handler.tags = ["maker"];
handler.command = /^(carbon)$/i;

export default handler;
