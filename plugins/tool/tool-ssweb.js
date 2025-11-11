let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (args.length === 0) {
        return m.reply(
            `Please provide a URL.\nExample: ${usedPrefix + command} https://example.com`
        );
    }

    const url = args.join(" ");

    await global.loading(m, conn);

    try {
        const apiUrl = `https://api.nekolabs.web.id/tools/ssweb?url=${encodeURIComponent(url)}&device=desktop&fullPage=false`;

        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.success || !data.result) throw new Error("No screenshot returned.");

        const imageUrl = data.result;

        const caption = `
Screenshot (DESKTOP)
URL: ${url}
`.trim();

        await conn.sendMessage(m.chat, { image: { url: imageUrl }, caption }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ssweb"];
handler.tags = ["tools"];
handler.command = /^(ssweb)$/i;

export default handler;
