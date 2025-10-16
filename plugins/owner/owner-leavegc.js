let handler = async (m, { conn, text }) => {
    const group = text || m.chat;
    await conn.sendMessage(group, {
        text: "This bot is leaving the group.",
    });
    await conn.groupLeave(group);
};

handler.help = ["leavegc"];
handler.tags = ["owner"];
handler.command = /^(out|leavegc)$/i;
handler.owner = true;

export default handler;
