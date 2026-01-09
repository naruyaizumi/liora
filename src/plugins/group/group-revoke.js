let handler = async (m, { conn }) => {
  await conn.groupRevokeInvite(m.chat);
  m.reply("Link reset");
};

handler.help = ["revoke"];
handler.tags = ["group"];
handler.command = /^(revoke)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;