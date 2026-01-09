let handler = async (m, { conn, args, usedPrefix, command }) => {
    const arg = (args[0] || "").toLowerCase();
    const mode = { open: "not_announcement", close: "announcement" }[arg];

    if (!mode) return m.reply(`Use: ${usedPrefix + command} open/close`);

    await conn.groupSettingUpdate(m.chat, mode);
    return m.reply(`Group ${arg === "open" ? "opened" : "closed"}`);
};

handler.help = ["group"];
handler.tags = ["group"];
handler.command = /^(g|group)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
