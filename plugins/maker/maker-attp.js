import { addExif } from "../../lib/sticker.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        if (!args[0])
            return m.reply(
                `🍙 *Masukkan teks untuk dibuat ATTP yaa!*\n\n🍤 *Contoh:* ${usedPrefix + command} Konichiwa~`
            );
        await global.loading(m, conn);
        let apiUrl = global.API("btz", "/api/maker/attp", { text: args.join(" ") }, "apikey");
        let response = await fetch(apiUrl);
        if (!response.ok) return m.reply("🍜 *Gagal memproses teks. Coba lagi nanti!*");
        let buffer = Buffer.from(await response.arrayBuffer());
        let stickerImage = await addExif(buffer, global.config.stickpack, global.config.stickauth);
        await conn.sendFile(m.chat, stickerImage, "sticker.webp", "", m);
    } catch (e) {
        console.error(e);
        m.reply(`🍩 *Ups error!* 🍧\n📄 ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["attp"];
handler.tags = ["maker"];
handler.command = /^(attp)$/i;

export default handler;
