let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        if (!args[0]) {
            return m.reply(
                `🍙 *Masukkan teks untuk dibuat ATTP yaa!*\n\n🍤 *Contoh:* ${usedPrefix + command} Konichiwa~`
            );
        }

        await global.loading(m, conn);

        const apiUrl = global.API("btz", "/api/maker/attp", { text: args.join(" ") }, "apikey");
        const response = await fetch(apiUrl);
        if (!response.ok) return m.reply("🍜 *Gagal memproses teks. Coba lagi nanti!*");

        const buffer = Buffer.from(await response.arrayBuffer());

        await conn.sendFile(m.chat, buffer, "sticker.webp", "", m, false, {
            asSticker: true,
        });
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
