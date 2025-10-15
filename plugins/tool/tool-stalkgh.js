let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text) return m.reply(`Enter GitHub username to search.\n› Example: ${usedPrefix + command} naruyaizumi`);
        await global.loading(m, conn);
        const res = await fetch(global.API("btz", "/api/stalk/github", { username: text }, "apikey"));
        if (!res.ok) return m.reply("Failed to access API endpoint.");

        const json = await res.json();
        if (json.code !== 200 || !json.result?.user) return m.reply("GitHub user not found.");

        const user = json.result.user;
        const created = new Date(user.createdAt).toLocaleDateString("id-ID");
        const updated = new Date(user.updatedAt).toLocaleDateString("id-ID");

        const caption = `\`\`\`
┌─[GITHUB STALKER]────────────
│  ${user.username}
└──────────────────────
Name       : ${user.name || "-"}
User ID    : ${user.idUser}
Node ID    : ${user.nodeId}
Type       : ${user.type}
Site Admin : ${user.isSiteAdmin ? "Yes" : "No"}
───────────────────────
Company    : ${user.company || "-"}
Blog       : ${user.blog || "-"}
Email      : ${user.email || "-"}
Hireable   : ${user.hireable ? "Yes" : "No"}
Bio        : ${user.bio || "-"}
───────────────────────
Public Repos : ${user.publicRepos}
Public Gists : ${user.publicGists}
Followers    : ${user.followers}
Following    : ${user.following}
───────────────────────
Created    : ${created}
Updated    : ${updated}
URL        : ${user.githubUrl}
───────────────────────
Profile info fetched successfully.
\`\`\``;

        await conn.sendMessage(
            m.chat,
            {
                image: { url: user.avatarUrl },
                caption,
                mentions: [m.sender],
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("Failed to fetch GitHub profile. Possibly invalid or unreachable.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["stalkgh"];
handler.tags = ["tools"];
handler.command = /^(stalkgh|ghstalk)$/i;

export default handler;