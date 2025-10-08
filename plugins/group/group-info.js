let handler = async (m, { conn, participants, groupMetadata }) => {
    const timestamp = new Date().toTimeString().split(" ")[0];
    const pp = await conn.profilePictureUrl(m.chat, "image").catch(() => "https://qu.ax/jVZhH.jpg");

    const { sWelcome, sBye } = global.db.data.chats[m.chat];
    const groupAdmins = participants.filter((p) => p.admin);
    const listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.id.split("@")[0]}`).join("\n");

    const owner =
        groupMetadata.owner ||
        groupAdmins.find((p) => p.admin === "superadmin")?.id ||
        m.chat.split`-`[0] + "@s.whatsapp.net";

    const text = [
        "```",
        `┌─[${timestamp}]────────────`,
        `│  GROUP INFO`,
        "└──────────────────────",
        `Group ID   : ${groupMetadata.id}`,
        `Name       : ${groupMetadata.subject}`,
        `Members    : ${participants.length}`,
        `Owner      : @${owner.split("@")[0]}`,
        "───────────────────────",
        "Admins:",
        listAdmin || "-",
        "───────────────────────",
        `Welcome Msg : ${sWelcome}`,
        `Leave Msg   : ${sBye}`,
        "───────────────────────",
        `Description :`,
        groupMetadata.desc?.toString() || "(none)",
        "```",
    ].join("\n");

    await conn.sendFile(m.chat, pp, null, text.trim(), m, null, {
        mentions: [...groupAdmins.map((v) => v.id), owner],
    });
};

handler.help = ["infogrup"];
handler.tags = ["group"];
handler.command = /^(gro?upinfo|info(gro?up|gc))$/i;
handler.group = true;
handler.admin = true;

export default handler;
