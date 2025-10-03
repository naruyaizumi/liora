let handler = async (m) => {
    try {
        let text = JSON.stringify(m, null, 2);
        await m.reply("```" + text + "```");
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
