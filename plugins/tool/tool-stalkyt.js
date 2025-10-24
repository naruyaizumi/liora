let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `Enter YouTube channel name to search.\n› Example: ${usedPrefix + command} naruyaizumi`
            );
        await global.loading(m, conn);

        const res = await fetch(global.API("btz", "/api/stalk/yt", { username: text }, "apikey"));
        if (!res.ok) return m.reply("Failed to access YouTube API.");

        const json = await res.json();
        if (!json.status || !json.result?.data?.length)
            return m.reply("YouTube channel not found.");

        const data = json.result.data[0];
        const { channelId, url, channelName, avatar, isVerified, subscriberH, description } = data;

        const caption = `\`\`\`
┌─[YOUTUBE STALKER]────────────
│  ${channelName}
└──────────────────────
Verified   : ${isVerified ? "Yes" : "No"}
Subscribers: ${subscriberH}
Channel ID : ${channelId}
───────────────────────
Description:
${description || "-"}
───────────────────────
URL: ${url}
───────────────────────
Channel info fetched successfully.
\`\`\``;

        await conn.sendMessage(
            m.chat,
            {
                image: { url: avatar },
                caption,
                mentions: [m.sender],
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

handler.help = ["stalkyt"];
handler.tags = ["tools"];
handler.command = /^(stalkyt|ytstalk)$/i;

export default handler;
