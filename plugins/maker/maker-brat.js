import { sticker } from "#add-on";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        if (!args[0])
            return m.reply(`Enter sticker text.\n› Example: ${usedPrefix + command} Konichiwa~`);

        await global.loading(m, conn);

        const res = await fetch(
            `https://api.nekolabs.web.id/canvas/brat/v1?text=${encodeURIComponent(args.join(" "))}`
        );
        if (!res.ok) throw new Error("Failed to fetch Brat API.");

        const buffer = Buffer.from(await res.arrayBuffer());

        const stickerImage = await sticker(buffer, {
            packName: global.config.stickpack || "",
            authorName: global.config.stickauth || "",
        });

        await conn.sendMessage(
            m.chat,
            {
                sticker: stickerImage,
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["brat"];
handler.tags = ["maker"];
handler.command = /^(brat)$/i;

export default handler;
