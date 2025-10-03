import { sticker } from "../../src/bridge.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        if (!args[0]) {
            return m.reply(
                `🍙 *Masukkan teks yang ingin dibuat BratVideo!*\n\n🍤 *Contoh:* ${usedPrefix + command} Konichiwa~*`
            );
        }

        await global.loading(m, conn);

        const apiUrl = global.API("btz", "/api/maker/brat-video", { text: args.join(" ") }, "apikey");
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("Gagal fetch API BratVideo");

        const buffer = Buffer.from(await res.arrayBuffer());
        const stickerImage = await sticker(buffer, {
            packName: global.config.stickpack || "",
            authorName: global.config.stickauth || "",
        });

        await conn.sendFile(m.chat, stickerImage, "brat.webp", "", m, false, {
            asSticker: true,
        });
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