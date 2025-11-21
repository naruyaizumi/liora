let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text)
        return m.reply(
            `Please enter a TikTok keyword!\nExample: ${usedPrefix + command} luxury girl`
        );

    await global.loading(m, conn);

    try {
        let res = await fetch(
            `https://api.elrayyxml.web.id/api/search/tiktok?q=${encodeURIComponent(text)}`
        );
        let json = await res.json();

        if (!json.status || !json.result || json.result.length === 0)
            throw "*No results found on TikTok!*";

        let results = json.result;
        let cards = [];

        for (let i = 0; i < Math.min(10, results.length); i++) {
            let item = results[i];

            let sizeMB = item.size_nowm ? (item.size_nowm / (1024 * 1024)).toFixed(2) : "N/A";

            let caption = `
Statistics:
Views: ${item.stats?.views || 0}
Likes: ${item.stats?.likes || 0}
Comments: ${item.stats?.comment || 0}
Shares: ${item.stats?.share || 0}
Downloads: ${item.stats?.download || 0}

Date: ${item.taken_at || "Unknown"}
`.trim();

            cards.push({
                video: { url: item.data },
                title: `${i + 1}. ${item.author?.nickname || "Unknown"}`,
                body: caption,
                footer: "TikTok Search Engine",
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Watch on TikTok",
                            url: `https://www.tiktok.com/@${item.author?.nickname}/video/${item.id}`,
                        }),
                    },
                ],
            });
        }

        await conn.sendCard(m.chat, {
            text: `Search results for: ${text}`,
            title: "TikTok Search",
            footer: "Select a button to view",
            cards: cards,
        });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tts"];
handler.tags = ["internet"];
handler.command = /^(tts)$/i;

export default handler;
