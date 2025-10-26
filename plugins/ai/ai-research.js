import { fetch } from "liora-lib";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text || typeof text !== "string") {
        return m.reply(
            `Please enter a research query.\n› Example: ${usedPrefix}${command} demonstrasi di Indonesia`
        );
    }

    try {
        await global.loading(m, conn);

        const apiUrl = `https://api.nekolabs.web.id/ai/ai-research?text=${encodeURIComponent(text)}`;
        const response = await fetch(apiUrl, { method: "GET" });

        if (!response.ok) {
            return m.reply("Request to Copilot AI failed. Please try again later.");
        }

        const json = await response.json();
        const { report, selected_images: images = [] } = json.result || {};

        if (!report) {
            return m.reply("No report was returned from Copilot AI.");
        }

        await conn.sendMessage(m.chat, { text: `AI Research:\n${report}` }, { quoted: m });

        if (Array.isArray(images) && images.length > 0) {
            const album = images.map((url, i) => ({
                image: { url },
                caption: `Report Image (${i + 1}/${images.length})`,
            }));
            await conn.sendAlbum(m.chat, album, { quoted: m });
        }
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["research"];
handler.tags = ["ai"];
handler.command = /^(research)$/i;

export default handler;
