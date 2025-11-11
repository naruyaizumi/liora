let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text) {
            return m.reply(
                `Usage: ${usedPrefix + command} <package>\nExample: ${usedPrefix + command} sharp`
            );
        }

        await global.loading(m, conn);

        const res = await fetch(
            `https://registry.npmjs.com/-/v1/search?text=${encodeURIComponent(text)}`
        );
        const { objects } = await res.json();

        if (!objects.length) {
            return m.reply(`No results found for "${text}".`);
        }

        const limited = objects.slice(0, 10);
        const result = [
            `NPM Search Result for "${text}"`,
            "",
            ...limited.map(
                ({ package: pkg }, i) =>
                    `${i + 1}. ${pkg.name} (v${pkg.version})\n    ↳ ${pkg.links.npm}`
            ),
        ].join("\n");

        await conn.sendMessage(m.chat, { text: result }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["npmsearch"];
handler.tags = ["internet"];
handler.command = /^(npm(js|search)?)$/i;

export default handler;
