let handler = async (m, { conn }) => {
    await conn.sendMessage(m.chat, { text: "PUNG! 🏓" });
};

handler.help = ["ping"];
handler.tags = ["info"];
handler.command = /^(ping)$/i;

export default handler;
