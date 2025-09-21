import { sticker } from "../../lib/sticker.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        if (!args[0])
            return m.reply(
                `🍙 *Masukkan teks yang ingin dibuat BratVideo!*\n\n🍤 *Contoh:* ${usedPrefix + command} Konichiwa*`
            );
        await global.loading(m, conn);
        let apiUrl = global.API("btz", "/api/maker/brat-video", { text: args.join(" ") }, "apikey");
        let response = await fetch(apiUrl);
        if (!response.ok)
            return m.reply("🍜 *Terjadi kesalahan saat memproses teks. Coba lagi nanti!*");
        let buffer = Buffer.from(await response.arrayBuffer());
        let stickerImage = await sticker(
            buffer,
            false,
            global.config.stickpack,
            global.config.stickauth
        );
        await conn.sendFile(m.chat, stickerImage, "brat.webp", "", m);
    } catch (e) {
        console.error(e);
        m.reply(`🍩 *Terjadi Kesalahan Teknis!*\n🍧 *Detail:* ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["bratvideo"];
handler.tags = ["maker"];
handler.command = /^(bratvideo|bratvid)$/i;

export default handler;
