let handler = async (m, { conn, args }) => {
    if (args.length < 2) {
        await conn.sendMessage(
            m.chat,
            {
                text: `⚠️ *Silakan pilih mode tampilan untuk screenshot!*\n\n📌 *Gunakan format:*\n\`.ssweb [angka] [url]\`\n\n🌐 *Mode yang tersedia:*\n🖥️ *1. Desktop*\n📱 *2. Tablet*\n📲 *3. Ponsel*`,
            },
            { quoted: m }
        );
        return;
    }
    let mode = args[0];
    let url = args.slice(1).join(" ");
    let devices = { 1: "desktop", 2: "tablet", 3: "phone" };
    if (!devices[mode])
        return m.reply(
            "⚠️ *Mode tidak valid! Pilih antara 1 (Desktop), 2 (Tablet), atau 3 (Ponsel).*"
        );
    await global.loading(m, conn);
    try {
        let device = devices[mode];
        let response = await fetch(
            global.API("btz", "/api/tools/ssweb", { url, device }, "apikey")
        );
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        let arrayBuffer = await response.arrayBuffer();
        let buffer = Buffer.from(arrayBuffer);
        await conn.sendMessage(
            m.chat,
            {
                image: buffer,
                caption: `📸 *Screenshot Tampilan ${device.toUpperCase()}*\n\n🔗 *URL: ${url}*`,
            },
            { quoted: m }
        );
    } catch (error) {
        console.error("❌ Error:", error);
        m.reply("❌ *Terjadi kesalahan saat mengambil screenshot!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["ssweb"];
handler.tags = ["tool"];
handler.command = /^(ssweb)$/i;

export default handler;
