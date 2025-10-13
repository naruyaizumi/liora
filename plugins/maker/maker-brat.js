import { sticker, fetch } from "liora-lib";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        if (!args[0])
            return m.reply(`Enter sticker text.\n› Example: ${usedPrefix + command} Konichiwa~`);

        await global.loading(m, conn);

        const res = await fetch(
            global.API("btz", "/api/maker/brat", { text: args.join(" ") }, "apikey")
        );
        if (!res.ok) throw new Error("Failed to fetch Brat API.");

        const buffer = Buffer.from(await res.arrayBuffer());

        const stickerImage = await sticker(buffer, {
            packName: global.config.stickpack || "",
            authorName: global.config.stickauth || "",
        });

        await conn.sendFile(m.chat, stickerImage, "sticker.webp", "", m, false, {
            asSticker: true,
        });
    } catch (e) {
        console.error(e);
        m.reply("Error: " + e.message);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["brat"];
handler.tags = ["maker"];
handler.command = /^(brat)$/i;

export default handler;
