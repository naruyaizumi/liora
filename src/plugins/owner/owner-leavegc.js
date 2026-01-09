let handler = async (m, { conn, text }) => {
  const gc = text || m.chat;
  
  await conn.sendMessage(gc, { text: "Leaving group" });
  await conn.groupLeave(gc);
};

handler.help = ["leavegc"];
handler.tags = ["owner"];
handler.command = /^(out|leavegc)$/i;
handler.owner = true;

export default handler;