import yts from "yt-search";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text)
        return m.reply(
            `Usage: ${usedPrefix + command} <query>\n› Example: ${usedPrefix + command} YAD`
        );

    try {
        await global.loading(m, conn);

        const search = await yts(text);
        const videos = search.videos;
        if (!Array.isArray(videos) || videos.length === 0)
            return m.reply(`No results found for "${text}".`);

        const video = videos[0];
        const info = `\`\`\`
Title    : ${video.title}
Duration : ${video.timestamp || "-"} (${video.seconds}s)
Views    : ${formatNumber(video.views)}
Channel  : ${video.author.name}${video.author.verified ? " ✔" : ""}
Uploaded : ${video.ago || "-"}
Select a format below to download:
\`\`\``;

        await conn.sendMessage(
            m.chat,
            {
                image: { url: video.thumbnail },
                caption: info,
                footer: "YouTube Search",
                title: "YouTube Downloader",
                interactiveButtons: [
                    {
                        name: "single_select",
                        buttonParamsJson: JSON.stringify({
                            title: "Select Format",
                            sections: [
                                {
                                    title: "Audio / Video Options",
                                    rows: [
                                        {
                                            header: "Audio",
                                            title: "YTMP3",
                                            description: "Download high-quality MP3 audio",
                                            id: `.ytmp3 ${video.url}`,
                                        },
                                        {
                                            header: "Audio",
                                            title: "YTPLAY",
                                            description: "Fast download audio directly from query",
                                            id: `.ytplay ${text}`,
                                        },
                                        {
                                            header: "Video",
                                            title: "YTMP4",
                                            description: "Download standard-quality MP4 video",
                                            id: `.ytmp4 ${video.url}`,
                                        },
                                        {
                                            header: "Extras",
                                            title: "Lyrics / Info",
                                            description:
                                                "Get lyrics or extra details for this song",
                                            id: `.lyrics ${text}`,
                                        },
                                    ],
                                },
                            ],
                        }),
                    },
                ],
                hasMediaAttachment: false,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("Error: Failed to process the request.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["play"];
handler.tags = ["downloader"];
handler.command = /^(play)$/i;

export default handler;

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return num.toString();
}
