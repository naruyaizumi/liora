let handler = async (m, { conn }) => {
    const start = Bun.nanoseconds();
    const msg = await conn.sendMessage(
        m.chat, { text: "PING!" }
    );
    const ns = Bun.nanoseconds() - start;
    const ms = (ns / 1_000_000).toFixed(0);
    await conn.sendMessage(
        m.chat, { text: `${ms} ms` }, { quoted: msg }
    );
};

handler.help = ["ping"];
handler.tags = ["info"];
handler.command = /^(ping)$/i;

export default handler;