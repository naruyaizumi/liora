let handler = async (m, { conn }) => {
    const start = performance.now();
    const end = performance.now();
    const ping = (end - start).toFixed(3);
    await conn.sendMessage(m.chat, { text: `PONG: ${ping} ms` }, { quoted: m });
};

handler.help = ["ping"];
handler.tags = ["info"];
handler.command = /^(ping)$/i;

export default handler;
