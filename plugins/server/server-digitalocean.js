import { getDropletInfo } from "../../lib/server.js";

let handler = async (m, { conn }) => {
    try {
        const token = global.config.token;
        if (!token) return m.reply("🍩 *API DigitalOcean belum diset!*");
        const { totalDroplets, dropletLimit, remainingDroplets, dropletList } =
            await getDropletInfo(token);
        const caption = `🍓 *Informasi Droplet DigitalOcean*
━━━━━━━━━━━━━━━━━━━
🧁 *Total Droplet Terpakai: ${totalDroplets}/${dropletLimit}*
🍬 *Sisa Droplet yang Bisa Dipakai: ${remainingDroplets}*
━━━━━━━━━━━━━━━━━━━
${dropletList}`;
        await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
    } catch {
        m.reply("🍩 *Terjadi kesalahan saat mengambil data DigitalOcean!*");
    }
};

handler.help = ["cekdroplet"];
handler.tags = ["server"];
handler.command = /^(cekdroplet|cekdo)$/i;
handler.mods = true;

export default handler;
