import { fetch } from "liora-lib";

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `Enter Twitter username to search.\n› Example: ${usedPrefix + command} naruyaizumi`
            );
        await global.loading(m, conn);

        const res = await fetch(
            global.API("btz", "/api/stalk/twitter", { username: text }, "apikey")
        );
        if (!res.ok) return m.reply("Failed to access Twitter API.");

        const json = await res.json();
        if (!json.status || !json.result)
            return m.reply("Twitter account not found or unavailable.");

        const {
            profileImage,
            bio,
            username,
            fullName,
            follower,
            following,
            totalPosts,
            favoritCount,
            createdAt,
            location,
        } = json.result;

        const joined = new Date(createdAt).toLocaleDateString("id-ID");

        const caption = `
Twitter Profile: @${username}

Name: ${fullName}
Bio: ${bio || "-"}

Followers: ${follower.toLocaleString()}
Following: ${following.toLocaleString()}
Tweets: ${totalPosts}
Likes: ${favoritCount}

Location: ${location || "-"}
Joined: ${joined}
`;

        await conn.sendMessage(
            m.chat,
            {
                image: { url: profileImage },
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

handler.help = ["stalktw"];
handler.tags = ["tools"];
handler.command = /^(stalktw|twstalk)$/i;

export default handler;
