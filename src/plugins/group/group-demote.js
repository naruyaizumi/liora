let handler = async (m, { conn, args, participants, usedPrefix, command }) => {
  let t = m.mentionedJid?.[0] || m.quoted?.sender || null;

  if (!t && args[0] && /^\d{5,}$/.test(args[0])) {
    const num = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    const lid = await conn.signalRepository.lidMapping.getLIDForPN(num);
    if (lid) t = lid;
  }

  if (!t && args[0]) {
    const raw = args[0].replace(/[^0-9]/g, "") + "@lid";
    if (participants.some(p => p.id === raw)) t = raw;
  }

  if (!t || !participants.some(p => p.id === t))
    return m.reply(`Demote member\nEx: ${usedPrefix + command} @628xxx`);

  await conn.groupParticipantsUpdate(m.chat, [t], "demote");

  await conn.sendMessage(
    m.chat,
    {
      text: `Demoted @${t.split("@")[0]}`,
      mentions: [t],
    },
    { quoted: m },
  );
};

handler.help = ["demote"];
handler.tags = ["group"];
handler.command = /^(demote)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;