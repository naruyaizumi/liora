let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text || !/^https:\/\/github\.com\/[\w-]+\/[\w-]+/i.test(text)) {
            return m.reply(
                `🍩 *Masukkan URL GitHub yang valid!*\n\n🍰 *Contoh:* ${usedPrefix + command} https://github.com/username/repo`
            );
        }
        await global.loading(m, conn);
        let parts = text.split("/");
        if (parts.length < 5) return m.reply("🍓 *URL GitHub tidak lengkap!*");
        let user = parts[3];
        let repo = parts[4];
        let url = `https://api.github.com/repos/${user}/${repo}/zipball`;
        let filename = `${repo}.zip`;
        await conn.sendFile(
            m.chat,
            url,
            filename,
            `🍰 *Berhasil mendownload repository:*\n📦 ${repo}`,
            m
        );
    } catch (e) {
        console.error(e);
        m.reply("🍩 *Gagal mengunduh repository. Pastikan URL benar!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["gitclone"];
handler.tags = ["downloader"];
handler.command = /^(gitclone)$/i;

export default handler;
