let handler = async (m, { conn, text, participants }) => {
    let isiPesan = text ? `📝 *Pesan Owner:*\n${text}` : "*––––––『 TAG All 』––––––*";
    let teks = `${isiPesan}`;
    for (let mem of participants) {
        teks += `\n@${mem.id.split("@")[0]}`;
    }
    await conn.sendMessage(m.chat, { text: teks, mentions: participants.map((a) => a.id) });
};

handler.help = ["tagall"];
handler.tags = ["group"];
handler.command = /^(tagall|all)$/i;
handler.group = true;
handler.owner = true;

export default handler;
