let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text) {
            return m.reply(`Need package\nEx: ${usedPrefix + command} baileys`);
        }

        await global.loading(m, conn);

        const res = await fetch(
            `https://registry.npmjs.com/-/v1/search?text=${encodeURIComponent(text)}`
        );
        const { objects } = await res.json();

        if (!objects.length) {
            return m.reply(`No results for "${text}"`);
        }

        const list = objects.slice(0, 10);
        const result = [
            `NPM Search: "${text}"`,
            "",
            ...list.map(
                ({ package: p }, i) => `${i + 1}. ${p.name} (v${p.version})\n    ↳ ${p.links.npm}`
            ),
        ].join("\n");

        await conn.sendMessage(m.chat, { text: result }, { quoted: m });
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["npmsearch"];
handler.tags = ["internet"];
handler.command = /^(npm(js|search)?)$/i;

export default handler;
