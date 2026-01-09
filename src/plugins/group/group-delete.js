let handler = async (m, { conn }) => {
  if (!m.quoted) return m.reply("Reply message to delete");
  
  const { chat, id, participant, sender, fromMe } = m.quoted.vM;
  if (fromMe) return m.reply("Cannot delete bot msg");
  
  const qs = participant || sender;
  if (!qs) return m.reply("No sender found");
  
  try {
    await conn.sendMessage(chat, {
      delete: {
        remoteJid: m.chat,
        fromMe: false,
        id,
        participant: qs,
      },
    });
  } catch (e) {
    m.reply(`Error: ${e.message}`);
  }
};

handler.help = ["delete"];
handler.tags = ["group"];
handler.command = /^(d|delete)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;