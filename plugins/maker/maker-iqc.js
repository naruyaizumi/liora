import { fetch } from "liora-lib";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `Please provide text for IQC Image.\nExample: ${usedPrefix + command} Liora and Izumi`
            );

        await global.loading(m, conn);

        const res = await fetch(global.API("btz", "/api/maker/iqc", { text }, "apikey"));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const buffer = Buffer.from(await res.arrayBuffer());
        if (!buffer || !buffer.length) throw new Error("Failed to generate image from API.");

        await conn.sendMessage(
            m.chat,
            { image: buffer, caption: `IQC Image result for: ${text}` },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["iqc"];
handler.tags = ["maker"];
handler.command = /^(iqc)$/i;

export default handler;
