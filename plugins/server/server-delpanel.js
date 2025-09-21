import { deletePanelUser } from "../../lib/server.js";

let handler = async (m, { args, conn }) => {
    const userId = args[0];
    if (!userId) return m.reply("🍩 *Mohon masukkan User ID!*");
    try {
        const result = await deletePanelUser(userId);
        if (result.success) {
            await conn.sendMessage(
                m.chat,
                {
                    text: `🧁 *User ID: ${userId} berhasil dihapus dari panel!*`,
                },
                { quoted: m }
            );
        } else {
            m.reply(`🍬 *Gagal menghapus User ID:* ${userId}\n📌 *Detail:* ${result.error}`);
        }
    } catch (err) {
        console.error(err.message);
        m.reply(`🍓 *Terjadi kesalahan:* ${err.message}`);
    }
};

handler.help = ["deletepanel"];
handler.tags = ["server"];
handler.command = /^(deletepanel|dp)$/i;
handler.owner = true;

export default handler;
