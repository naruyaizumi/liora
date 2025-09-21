import { listFiles } from "../../lib/server.js";

let handler = async (m, { args, conn }) => {
    const domain = global.config.domain;
    const apikey = global.config.apikey;
    const capikey = global.config.capikey;
    const serverId = args[0];
    const directory = args[1] || "/";
    if (!serverId) return m.reply("🍩 *Mohon masukkan Server ID!*");
    try {
        const messageText = await listFiles(domain, apikey, capikey, serverId, directory);
        await conn.sendMessage(m.chat, { text: messageText }, { quoted: m });
    } catch (error) {
        console.error(error.message);
        m.reply(`🍓 *Terjadi kesalahan:* ${error.message}`);
    }
};

handler.help = ["listfiles"];
handler.tags = ["server"];
handler.command = /^(listfiles|lf)$/i;
handler.owner = true;

export default handler;
