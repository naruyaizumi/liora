let handler = async (m, { conn }) => {
    try {
        const data = await conn.fetchBlocklist();
        if (!data || !data.length) return m.reply("No blocked numbers found.");

        const list = data.map((jid, i) => `${i + 1}. @${jid.split("@")[0]}`).join("\n");

        const output = [
            "=== Blocked Numbers ===",
            `Total: ${data.length}`,
            "──────────────────────",
            list,
        ].join("\n");

        await conn.sendMessage(m.chat, output, m, { mentions: data });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["listblock"];
handler.tags = ["info"];
handler.command = /^(listb(lo(ck|k)?)?)$/i;
handler.owner = true;

export default handler;
