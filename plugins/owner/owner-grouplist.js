let handler = async (m, { conn }) => {
    let groups = Object.entries(conn.chats)
        .filter(
            ([jid, chat]) =>
                jid.endsWith("@g.us") &&
                chat.isChats &&
                !chat.isCommunity &&
                !chat.isCommunityAnnounce &&
                !chat?.metadata?.isCommunity &&
                !chat?.metadata?.isCommunityAnnounce
        )
        .map((v) => v[0]);
    let txt = "";
    for (let jid of groups) {
        let metadata = await conn.groupMetadata(jid).catch((_) => null); // eslint-disable-line no-unused-vars
        if (!metadata) continue;
        let name = metadata.subject || jid;
        let memberCount = metadata.participants?.length || 0;
        let isBotAdmin = metadata.participants?.find((v) => v.id == conn.user.jid)?.admin;
        if (isBotAdmin) {
            let invite = await conn.groupInviteCode(jid).catch((_) => null); // eslint-disable-line no-unused-vars
            txt += `🎀 *${name}*\n🍬 *${jid}*\n🍡 *Member: ${memberCount}*\n🍰 *Link: https://chat.whatsapp.com/${invite || "Tidak bisa diambil"}*\n\n`;
        } else {
            txt += `🎀 *${name}*\n🍬 *${jid}*\n🍡 *Member: ${memberCount}*\n\n`;
        }
    }
    m.reply(`🎀 *List Semua Grup Aktif*\n🍓 *Total Grup: ${groups.length}*\n\n${txt}`.trim());
};

handler.help = ["grouplist"];
handler.tags = ["group"];
handler.command = /^(group(s|list)|(s|list)group)$/i;
handler.owner = true;

export default handler;
