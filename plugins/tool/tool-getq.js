let handler = async (m, { conn }) => {
    try {
        let json = JSON.stringify(m, null, 2);
        await conn.sendMessage(
            m.chat,
            { document: Buffer.from(json), mimetype: "application/json", fileName: "debug.json" },
            { quoted: m }
        );
    } catch (error) {
        console.error(error);
        m.reply("❌ *Error saat membaca data pesan.*");
    }
};

handler.help = ["debug"];
handler.tags = ["tool"];
handler.command = /^(getq|q|debug)$/i;
handler.mods = true;

export default handler;
