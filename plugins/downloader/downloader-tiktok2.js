import { fetch } from "../../src/bridge.js";

let handler = async (m, { conn, args }) => {
    if (!args[0]) return m.reply("Usage: .tiktok2 <tiktok-url>");
    const url = args[0].trim();

    if (
        !/^https?:\/\/(www\.)?(tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com|m\.tiktok\.com)\/.+/i.test(
            url
        )
    )
        return m.reply("Invalid URL. Please use a valid TikTok link.");

    await global.loading(m, conn);

    try {
        const api = `https://tiktok-scraper7.p.rapidapi.com?url=${encodeURIComponent(url)}&hd=1`;
        const res = await fetch(api, {
            headers: {
                "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
                "X-RapidAPI-Key": "ca5c6d6fa3mshfcd2b0a0feac6b7p140e57jsn72684628152a",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Linux x86_64)",
                "Accept-Encoding": "gzip",
            },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        const json = await res.json();
        await conn.sendMessage(
            m.chat,
            {
                text:
                    "Raw API Response:\n```" + JSON.stringify(json, null, 2).slice(0, 4000) + "```",
            },
            { quoted: m }
        );
    } catch (err) {
        console.error("[tiktok2]", err);
        await m.reply("Error: " + err.message);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tiktok2"];
handler.tags = ["downloader"];
handler.command = /^(tiktok2|tt2)$/i;

export default handler;
