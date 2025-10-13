let handler = async (m) => {
    const startTime = performance.now();
    const endTime = performance.now();
    const responseTime = (endTime - startTime).toFixed(3);
    await m.reply(`PONG: ${responseTime} ms`);
};

handler.help = ["ping"];
handler.tags = ["info"];
handler.command = /^(ping)$/i;

export default handler;
