let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `Enter repository name to search.\n› Example: ${usedPrefix + command} naruyaizumi liora\n› Or: ${usedPrefix + command} naruyaizumi/liora`
            );

        await global.loading(m, conn);
        const repoQuery = text.includes("/") ? text : text.replace(/\s+/, "/");
        const res = await fetch(
            global.API("btz", "/api/stalk/repo", { repo: repoQuery }, "apikey")
        );
        if (!res.ok) return m.reply("Failed to access API endpoint.");

        const json = await res.json();
        if (json.code !== 200 || !json.result?.items?.length)
            return m.reply("Repository not found.");

        const repo = json.result.items[0];
        const author = repo.author;
        const created = new Date(repo.createdAt).toLocaleDateString("id-ID");
        const updated = new Date(repo.updatedAt).toLocaleDateString("id-ID");
        const pushed = new Date(repo.pushedAt).toLocaleDateString("id-ID");

        const caption = `\`\`\`
┌─[GITHUB REPOSITORY STALKER]────────────
│  ${repo.fullNameRepo}
└──────────────────────
Author
Username   : ${author.username}
User ID    : ${author.id_user}
URL        : ${author.user_github_url}
Type       : ${author.type}
Site Admin : ${author.isSiteAdmin ? "Yes" : "No"}
───────────────────────
Repository
ID          : ${repo.id}
Node ID     : ${repo.nodeId}
Name        : ${repo.nameRepo}
Full Name   : ${repo.fullNameRepo}
Description : ${repo.description || "-"}
───────────────────────
Stars    : ${repo.stargazers}
Watchers : ${repo.watchers}
Forks    : ${repo.forks}
───────────────────────
Branch   : ${repo.defaultBranch}
Private  : ${repo.isPrivate ? "Yes" : "No"}
Fork     : ${repo.isFork ? "Yes" : "No"}
───────────────────────
URL       : ${repo.url_repo}
Git URL   : ${repo.git_url}
SSH URL   : ${repo.ssh_url}
Clone URL : ${repo.clone_url}
SVN URL   : ${repo.svn_url}
Homepage  : ${repo.homepage || "-"}
───────────────────────
Created : ${created}
Updated : ${updated}
Pushed  : ${pushed}
───────────────────────
Repository info fetched successfully.
\`\`\``;

        await conn.sendMessage(
            m.chat,
            {
                image: { url: author.avatar_url },
                caption,
                mentions: [m.sender],
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("Failed to fetch repository information. Possibly invalid or unreachable.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["stalkrepo"];
handler.tags = ["tools"];
handler.command = /^(stalkrepo|repostalk)$/i;

export default handler;
