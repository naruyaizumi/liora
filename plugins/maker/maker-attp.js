import { fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        const text = args.join(" ");
        if (!text)
            return m.reply(`Please provide text for ATTP.\nExample: ${usedPrefix + command} Hello`);

        await global.loading(m, conn);

        const apiUrl = global.API("btz", "/api/maker/attp", { text }, "apikey");
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("Failed to process text. Please try again later.");

        const buffer = Buffer.from(await res.arrayBuffer());
        if (!buffer || !buffer.length) throw new Error("Failed to get sticker from API.");

        await conn.sendMessage(m.chat, { sticker: buffer }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["attp"];
handler.tags = ["maker"];
handler.command = /^(attp)$/i;

export default handler;
