let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `Enter Instagram username to search.\n› Example: ${usedPrefix + command} naruyaizumi`
            );
        await global.loading(m, conn);
        const res = await fetch(global.API("btz", "/api/stalk/ig", { username: text }, "apikey"));
        if (!res.ok) return m.reply("Failed to access API endpoint.");

        const json = await res.json();
        if (json.code !== 200 || !json.result) return m.reply("Instagram account not found.");

        const ig = json.result;
        const caption = `\`\`\`
┌─[INSTAGRAM STALKER]────────────
│  ${ig.username}
└──────────────────────
Full Name  : ${ig.fullName || "-"}
Bio        : ${ig.bio || "-"}
───────────────────────
Followers  : ${ig.followers}
Following  : ${ig.following}
Posts      : ${ig.postsCount}
───────────────────────
Profile info fetched successfully.
\`\`\``;

        await conn.sendMessage(
            m.chat,
            {
                image: { url: ig.photoUrl },
                caption,
                mentions: [m.sender],
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("Failed to fetch Instagram profile. Possibly invalid or unreachable.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["stalkig"];
handler.tags = ["tools"];
handler.command = /^(stalkig|igstalk)$/i;

export default handler;
