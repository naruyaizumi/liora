import { sticker, fetch } from "liora-lib";

let handler = async (m, { conn, args }) => {
    try {
        const q = m.quoted ?? m;
        const text = q.text || args.join(" ");
        if (!text) return m.reply("Please enter or quote a message to generate a quote sticker.");

        const name = q.name || m.name || "Anonymous";
        const profile = await conn.profilePictureUrl(q.sender, "image").catch(() => null);
        const avatar = profile || "https://qu.ax/yqEpZ.jpg";

        await global.loading(m, conn);

        const api = `https://api.nekolabs.my.id/canvas/quote-chat?text=${encodeURIComponent(text)}&name=${encodeURIComponent(name)}&profile=${encodeURIComponent(avatar)}&color=%23000000`;
        const res = await fetch(api);
        if (!res.ok) throw new Error("Failed to contact Quote Chat API.");

        const buffer = Buffer.from(await res.arrayBuffer());

        const stickerImage = await sticker(buffer, {
            packName: global.config.stickpack || "",
            authorName: global.config.stickauth || "",
        });

        await conn.sendMessage(
            m.chat,
            { sticker: stickerImage },
            { quoted: m }
        );
    } catch (e) {
        m.reply("Error: " + e.message);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["qc"];
handler.tags = ["maker"];
handler.command = /^(qc)$/i;

export default handler;