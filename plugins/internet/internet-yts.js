import yts from "yt-search";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(
            `Usage: ${usedPrefix + command} <query>\n› Example: ${usedPrefix + command} YAD`
        );
    }

    try {
        await global.loading(m, conn);

        const search = await yts(text);
        const videos = search.videos;
        if (!Array.isArray(videos) || videos.length === 0) {
            return m.reply(`No results found for "${text}".`);
        }

        const thumb = videos[0].thumbnail;
        const rows = videos.map((video, index) => ({
            header: `Result ${index + 1}`,
            title: video.title,
            description: `${video.author.name} • ${video.timestamp || "-"} • ${formatNumber(video.views)} views`,
            id: `.play ${video.url}`,
        }));

        const info = `Search results for: ${text}\nSelect a song below to play.`;

        await conn.sendButton(m.chat, {
            image: { url: thumb },
            caption: info,
            title: "YouTube Search",
            footer: "Select a song below",
            buttons: [
                {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "Select Song",
                        sections: [
                            {
                                title: "Songs",
                                rows: rows,
                            },
                        ],
                    }),
                },
            ],
            hasMediaAttachment: true,
        });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["yts"];
handler.tags = ["internet"];
handler.command = /^(yts)$/i;

export default handler;

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toString();
}
