let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text)
            return m.reply(
                `Enter NPM package name to search.\n› Example: ${usedPrefix + command} naruyaizumi`
            );
        await global.loading(m, conn);
        const res = await fetch(global.API("btz", "/api/stalk/npm", { name: text }, "apikey"));
        if (!res.ok) return m.reply("Failed to access API endpoint.");

        const json = await res.json();
        if (!json.status || !json.result) return m.reply("NPM package not found.");

        const result = json.result;
        const latestVersion = result["dist-tags"]?.latest;
        const data = result.versions?.[latestVersion];
        const created = new Date(result.time?.created).toLocaleDateString("id-ID");
        const modified = new Date(result.time?.modified).toLocaleDateString("id-ID");

        const caption = `\`\`\`
┌─[NPM PACKAGE STALKER]────────────
│  ${data.name}
└──────────────────────
Version     : ${data.version}
Description : ${data.description || "-"}
Main File   : ${data.main || "-"}
───────────────────────
Author      : ${data.author?.name || "-"}
License     : ${data.license || "-"}
───────────────────────
Repository  : ${data.repository?.url?.replace(/^git\+/, "").replace(/\.git$/, "") || "-"}
Homepage    : ${data.homepage || "-"}
Bug Tracker : ${data.bugs?.url || "-"}
───────────────────────
Dependencies : ${Object.keys(data.dependencies || {}).join(", ") || "-"}
───────────────────────
NPM User
Name  : ${data._npmUser?.name || "-"}
Email : ${data._npmUser?.email || "-"}
───────────────────────
Maintainers
${(result.maintainers || []).map((v) => `• ${v.name} (${v.email})`).join("\n") || "-"}
───────────────────────
Created  : ${created}
Modified : ${modified}
───────────────────────
Package info fetched successfully.
\`\`\``;

        await conn.sendMessage(
            m.chat,
            {
                text: caption,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("Failed to fetch NPM package information. Possibly invalid or unreachable.");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["stalknpm"];
handler.tags = ["tools"];
handler.command = /^(stalknpm|npmstalk)$/i;

export default handler;
