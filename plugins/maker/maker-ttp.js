import { sticker } from "../../lib/sticker.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        if (!args[0]) {
            return m.reply(
                `🍱 *Masukkan teks yang ingin dibuat TTP!*\n\n🍜 *Contoh: ${usedPrefix + command} Konichiwa*`
            );
        }
        await global.loading(m, conn);
        let apiUrl = global.API("btz", "/api/maker/ttp", { text: args.join(" ") }, "apikey");
        let res = await fetch(apiUrl);
        if (!res.ok) throw new Error("Gagal fetch dari API");

        let buffer = Buffer.from(await res.arrayBuffer());
        let stickerImage = await sticker(
            buffer,
            false,
            global.config.stickpack,
            global.config.stickauth
        );
        await conn.sendFile(m.chat, stickerImage, "sticker.webp", "", m);
    } catch (e) {
        console.error(e);
        m.reply(`❌ *Terjadi kesalahan teknis!*\n🥠 *Detail:* ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ttp"];
handler.tags = ["maker"];
handler.command = /^(ttp)$/i;

export default handler;
