import { load } from "cheerio";
import { fetch } from "liora-lib";

let handler = async (m, { text, usedPrefix, command, conn }) => {
    try {
        if (!text)
            return m.reply(`Missing search query.

Example:
${usedPrefix + command} genesis`);

        await global.loading(m, conn);

        const response = await fetch(`https://alkitab.me/search?q=${encodeURIComponent(text)}`, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36",
            },
        });

        if (!response.ok) throw new Error(`Failed to reach server: ${response.status}`);

        const html = await response.text();
        const $ = load(html);
        const results = [];

        $("div.vw").each((_, el) => {
            const verse = $(el).find("p").text().trim();
            const link = $(el).find("a").attr("href") || "#";
            const title = $(el).find("a").text().trim();
            if (verse && title) results.push({ title, verse, link });
        });

        if (!results.length) return m.reply("No results found.");

        const first = results[0];
        const others =
            results.slice(1).map(
                (v) => `${v.title}
${v.link}
${v.verse}`
            ).join(`

────────────────────────────
`) || "No additional results.";

        await conn.sendMessage(
            m.chat,
            {
                text: `Bible Search Result: ${text}

────────────────────────────
${first.title}
${first.verse}
${first.link}

────────────────────────────
Other results:
${others}`,
                contextInfo: {
                    externalAdReply: {
                        title: first.title,
                        body: "Bible Search Result",
                        thumbnailUrl: "https://telegra.ph/file/a333442553b1bc336cc55.jpg",
                        sourceUrl: first.link || "",
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    } catch (err) {
        console.error(err);
        m.reply("An error occurred while processing your request.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["bible"];
handler.tags = ["internet"];
handler.command = /^(bible|alkitab)$/i;

export default handler;
