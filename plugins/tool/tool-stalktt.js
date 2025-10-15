let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `Enter TikTok username to search.\n› Example: ${usedPrefix + command} naruyaizumi`
            );
        await global.loading(m, conn);
        const res = await fetch(global.API("btz", "/api/stalk/tt", { username: text }, "apikey"));
        if (!res.ok) return m.reply("Failed to access TikTok API.");

        const json = await res.json();
        if (!json.status || !json.result)
            return m.reply("TikTok account not found or may be private.");

        const { username, description, likes, followers, following, totalPosts, profile } =
            json.result;

        const caption = `\`\`\`
┌─[TIKTOK STALKER]────────────
│  @${username}
└──────────────────────
Bio        : ${description || "-"}
───────────────────────
Followers  : ${followers}
Following  : ${following}
Likes      : ${likes}
Posts      : ${totalPosts}
───────────────────────
Profile info fetched successfully.
\`\`\``;

        await conn.sendMessage(
            m.chat,
            {
                image: { url: profile },
                caption,
                mentions: [m.sender],
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("Failed to fetch TikTok profile. Possibly invalid or unreachable.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["stalktt"];
handler.tags = ["tools"];
handler.command = /^(stalktt|ttstalk)$/i;

export default handler;
