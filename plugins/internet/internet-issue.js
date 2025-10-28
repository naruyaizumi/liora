import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const query = args.join(" ").trim();
    if (!query)
        return m.reply(
            `Please provide a search keyword.\n› Example: ${usedPrefix + command} decrypt`
        );

    await global.loading(m, conn);
    try {
        const res = await fetch(
            `https://api.nekolabs.web.id/discovery/github/issues?q=${encodeURIComponent(query)}`
        );
        if (!res.ok) throw new Error(`Failed to contact API. Status: ${res.status}`);
        const json = await res.json();

        if (!json.success || !Array.isArray(json.result) || !json.result.length)
            return m.reply("No matching issues found.");

        const limited = json.result.slice(0, 25);
        const list = limited.map((i, idx) => `${idx + 1}. ${i.title}\nURL: ${i.url}`).join("\n\n");

        await conn.sendMessage(
            m.chat,
            { text: `GitHub Issues — "${query}"\n\n${list}` },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["issue"];
handler.tags = ["internet"];
handler.command = /^(issue)$/i;

export default handler;
