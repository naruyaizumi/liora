let handler = async (m, { conn }) => {
    const startTime = performance.now();
    const endTime = performance.now();
    const responseTime = (endTime - startTime).toFixed(3);
    const timestamp = new Date().toTimeString().split(" ")[0];

    const text = [
        "```",
        `[${timestamp}] Liora Ping`,
        "────────────────────────",
        `Response Time : ${responseTime} ms`,
        "────────────────────────",
        "```",
    ].join("\n");

    await conn.sendMessage(m.chat, { text }, { quoted: m });
};

handler.help = ["ping"];
handler.tags = ["info"];
handler.command = /^(ping)$/i;

export default handler;
