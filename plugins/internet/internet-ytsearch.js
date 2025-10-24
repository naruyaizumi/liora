import yts from "yt-search";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text)
        return m.reply(
            `Please enter a search keyword.\nExample: ${usedPrefix + command} supranatural`
        );

    await global.loading(m, conn);

    try {
        const search = await yts(text);
        const results = search.videos;

        if (!results.length) return m.reply("No videos found.");

        const sections = [
            {
                title: "YouTube Search Results",
                rows: results.slice(0, 25).map((v, i) => ({
                    header: v.title,
                    title: `${i + 1}. ${v.author.name}`,
                    description: `Duration: ${v.timestamp} | Views: ${v.views}`,
                    id: `.play ${v.title}`,
                })),
            },
        ];

        await conn.sendMessage(
            m.chat,
            {
                image: { url: results[0].thumbnail },
                caption: `Found ${results.length} YouTube results.\nPlease select the video or audio you'd like.`,
                footer: "YouTube Search",
                title: "Select a Result",
                interactiveButtons: [
                    {
                        name: "single_select",
                        buttonParamsJson: JSON.stringify({
                            title: "Select a Result",
                            sections,
                        }),
                    },
                ],
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ytsearch"];
handler.tags = ["internet"];
handler.command = /^(yt(s|search))$/i;

export default handler;
