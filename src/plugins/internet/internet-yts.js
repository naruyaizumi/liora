let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(
            `Usage: ${usedPrefix + command} <query>\n› Example: ${usedPrefix + command} neck deep`
        );
    }

    try {
        await global.loading(m, conn);

        const url = `https://api.nekolabs.web.id/discovery/youtube/search?q=${encodeURIComponent(text)}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success || !Array.isArray(data.result)) {
            throw new Error("Invalid API response");
        }

        const videos = data.result;

        if (videos.length === 0) {
            return m.reply(`No results found for "${text}".`);
        }

        const rows = videos.map((video, index) => ({
            header: `Result ${index + 1}`,
            title: video.title,
            description: `${video.channel} • ${video.duration || "-"}`,
            id: `.play ${video.title}`,
        }));

        await conn.sendButton(m.chat, {
            image: videos[0].cover,
            caption: "*Select a video from the results above*",
            title: "YouTube Search Results",
            footer: `Found ${videos.length} results for "${text}"`,
            interactiveButtons: [
                {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "Select Video",
                        sections: [
                            {
                                title: `All Results (${videos.length})`,
                                rows: rows,
                            },
                        ],
                    }),
                },
            ],
            hasMediaAttachment: true,
        });
    } catch (e) {
        global.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["yts"];
handler.tags = ["internet"];
handler.command = /^(yts)$/i;

export default handler;