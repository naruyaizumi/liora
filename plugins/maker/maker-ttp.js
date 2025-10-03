import { addExif } from "../../src/bridge.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        if (!args[0]) {
            return m.reply(
                `🍱 *Masukkan teks yang ingin dibuat TTP!*\n🍜 *Contoh: ${usedPrefix + command} Konichiwa*`
            );
        }

        await global.loading(m, conn);

        const apiUrl = global.API("btz", "/api/maker/ttp", { text: args.join(" ") }, "apikey");
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("Gagal fetch dari API TTP");

        const buffer = Buffer.from(await res.arrayBuffer());
        const stickerImage = await addExif(buffer, {
            packName: global.config.stickpack || "",
            authorName: global.config.stickauth || "",
            emojis: [],
        });

        await conn.sendFile(m.chat, stickerImage, "sticker.webp", "", m, false, {
            asSticker: true,
        });
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