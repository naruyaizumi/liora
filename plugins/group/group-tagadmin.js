let handler = async (m, { conn, participants, groupMetadata }) => {
    let pp = await conn.profilePictureUrl(m.chat, "image").catch((_) => "https://qu.ax/jVZhH.jpg"); // eslint-disable-line no-unused-vars
    const { subject } = groupMetadata;
    const groupAdmins = participants.filter((p) => p.admin);
    const mentionJids = groupAdmins.map((p) => p.id);
    let listAdmin = groupAdmins.map((v, i) => `*❁ ${i + 1}.* @${v.id.split("@")[0]}`).join("\n");
    let caption = `
*╭─❁ Daftar Admin Grup ❁*
*│ Grup: ${subject}*
*│*
${listAdmin}
*╰─────────────❁*
`.trim();
    await conn.sendMessage(
        m.chat,
        {
            image: { url: pp },
            caption,
            mentions: mentionJids,
        },
        { quoted: m }
    );
};

handler.help = ["tagadmin"];
handler.tags = ["group"];
handler.command = /^(tagadmin|listadmin)$/i;
handler.group = true;
handler.owner = true;

export default handler;
