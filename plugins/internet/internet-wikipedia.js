import { fetch } from "../../src/bridge.js";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text)
        return m.reply(
            `Usage: ${usedPrefix + command} <keyword>\nExample: ${usedPrefix + command} OpenAI`
        );

    await global.loading(m, conn);

    try {
        const apiUrl = global.API("btz", "/api/search/wikipedia", { text }, "apikey");
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

        const json = await response.json();
        const { title, isi } = json.result || {};

        if (!title || !isi) return m.reply(`No results found for "${text}".`);

        const timestamp = new Date().toTimeString().split(" ")[0];
        const result = [
            "```",
            `┌─[${timestamp}]────────────`,
            `│  WIKIPEDIA SEARCH`,
            "└──────────────────────",
            `Query   : ${text}`,
            "───────────────────────",
            `${title}`,
            "───────────────────────",
            isi,
            "```",
        ].join("\n");

        await conn.sendMessage(m.chat, { text: result }, { quoted: m });
    } catch (e) {
        console.error(e);
        await m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["wiki"];
handler.tags = ["internet"];
handler.command = /^(wiki|wikipedia)$/i;

export default handler;
