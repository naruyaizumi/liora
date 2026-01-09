let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return m.reply(`Ask Felo AI\nEx: ${usedPrefix + command} what's today date`);

    try {
        await global.loading(m, conn);

        const api = `https://api.nekolabs.web.id/text-generation/feloai?text=${encodeURIComponent(text)}`;
        const res = await fetch(api);
        if (!res.ok) return m.reply("API error");

        const json = await res.json();
        const result = json?.result;
        const reply = result?.text;

        if (!reply) return m.reply("No response");

        let src = "";
        if (Array.isArray(result?.sources) && result.sources.length > 0) {
            src =
                "\n\n*Sources:*\n" +
                result.sources
                    .slice(0, 10)
                    .map((s) => `${s.index}. ${s.title || "Untitled"}\n${s.url}`)
                    .join("\n\n");
        }

        await conn.sendMessage(m.chat, { text: `Felo AI:\n${reply.trim()}${src}` }, { quoted: m });
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["feloai"];
handler.tags = ["ai"];
handler.command = /^(feloai)$/i;

export default handler;
