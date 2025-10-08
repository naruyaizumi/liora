let handler = async (m, { conn, text }) => {
    let group = text ? text : m.chat;
    await conn.groupLeave(group);
};

handler.help = ["leavegc"];
handler.tags = ["owner"];
handler.command = /^(out|leavegc)$/i;
handler.owner = true;

export default handler;
