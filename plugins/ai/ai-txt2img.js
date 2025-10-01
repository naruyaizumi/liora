let handler = async (m, { conn, usedPrefix, command, args }) => {
    try {
        await global.loading(m, conn);
        if (!args.length)
            return m.reply(
                `🍩 *Masukkan kata kunci untuk membuat gambar!*\n\n🍰 *Contoh: ${usedPrefix + command} cat,fish*`
            );
        let query = args.join(" ");
        let apiUrl = global.API("btz", "/api/maker/text2img", { text: query }, "apikey");
        let response = await fetch(apiUrl);
        if (!response.ok)
            return m.reply("🍬 *Terjadi kesalahan saat memproses gambar. Coba lagi nanti!*");
        await conn.sendMessage(
            m.chat,
            {
                image: { url: apiUrl },
                caption: `🍱 *Gambar telah dibuat berdasarkan:*\n🍡 *${query}*`,
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`🍙 *Terjadi Kesalahan Teknis!*\n🍜 *Detail:* ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["txt2img"];
handler.tags = ["ai"];
handler.command = /^(txt2img|text2img)$/i;

export default handler;
