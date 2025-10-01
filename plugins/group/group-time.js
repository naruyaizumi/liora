let handler = async (m, { conn, args, usedPrefix, command }) => {
    let action = (args[0] || "").toLowerCase();
    let durationArg = args[1];
    if (!["open", "close"].includes(action) || !durationArg) {
        return m.reply(
            `
🍩 *Format salah Contoh penggunaan:*

🍬 *Tutup grup selama 1 menit:*
*${usedPrefix + command} close 1m*

🍡 *Buka grup selama 2 jam:*
*${usedPrefix + command} open 2j*

🍰 *Tutup grup selama 1 hari:*
*${usedPrefix + command} close 1h*
`.trim()
        );
    }
    let durationMs = parseDuration(durationArg);
    if (!durationMs)
        return m.reply("🍫 *Format waktu tidak valid! Gunakan m (menit), j (jam), atau h (hari).*");
    let isClose = action === "close" ? "announcement" : "not_announcement";
    let now = new Date();
    await conn.groupSettingUpdate(m.chat, isClose);
    await conn.sendMessage(
        m.chat,
        {
            text: `🍙 *Grup berhasil di-${action === "close" ? "tutup" : "buka"}!*\n⏳ *Akan otomatis di-${action === "close" ? "buka" : "tutup"} pada:*\n🕒 *${new Date(now.getTime() + durationMs).toLocaleString("id-ID")}*`,
            mentions: [m.sender],
        },
        { quoted: m }
    );
    setTimeout(async () => {
        let newStatus = isClose === "announcement" ? "not_announcement" : "announcement";
        await conn.groupSettingUpdate(m.chat, newStatus);
        await conn.sendMessage(m.chat, {
            text: `🍱 *Waktu habis~*\n🍡 *Grup kini telah di-${newStatus === "announcement" ? "tutup" : "buka"} kembali!*\n🕒 *Sekarang: ${new Date().toLocaleString("id-ID")}*`,
            mentions: [m.sender],
        });
    }, durationMs);
};

handler.help = ["grouptime"];
handler.tags = ["group"];
handler.command = /^(grouptime|gctime)$/i;
handler.botAdmin = true;
handler.admin = true;
handler.group = true;

export default handler;

function parseDuration(str) {
    let match = str.match(/^(\d+)([mjh])$/i);
    if (!match) return null;
    let val = parseInt(match[1]);
    let unit = match[2].toLowerCase();
    switch (unit) {
        case "m":
            return val * 60 * 1000;
        case "j":
            return val * 60 * 60 * 1000;
        case "h":
            return val * 24 * 60 * 60 * 1000;
        default:
            return null;
    }
}
