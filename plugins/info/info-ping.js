let handler = async (m, { conn }) => {
    const start = performance.now();
    const q = await conn.sendMessage(m.chat, { text: "PUNG 🏓" });
    const ping = (performance.now() - start).toFixed(2);
    await conn.sendMessage(m.chat, { text: `Response: ${ping} ms` }, { quoted: q });
};

handler.help = ["ping"];
handler.tags = ["info"];
handler.command = /^(ping)$/i;

export default handler;
