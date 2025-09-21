let handler = async (m, { args, conn }) => {
    try {
        const token = global.config.token;
        if (!token) return m.reply("🍩 *API DigitalOcean belum diset!*");
        const headers = { Authorization: `Bearer ${token}` };
        if (!args[0]) return m.reply("🍓 *Masukkan ID droplet yang ingin dihapus!*");
        const dropletId = args[0];
        const deleteResponse = await fetch(
            `https://api.digitalocean.com/v2/droplets/${dropletId}`,
            {
                method: "DELETE",
                headers,
            }
        );
        if (!deleteResponse.ok) {
            if (deleteResponse.status === 404) {
                throw new Error("🍰 *Droplet dengan ID tersebut tidak ditemukan!*");
            }
            throw new Error("🧁 *Gagal menghapus droplet!*");
        }
        await conn.sendMessage(m.chat, {
            text: `🍬 *Droplet dengan ID ${dropletId} berhasil dihapus!*`,
        });
    } catch (err) {
        m.reply(err.message);
    }
};

handler.help = ["deldroplet"];
handler.tags = ["server"];
handler.command = /^(delvps|deldroplet)$/i;
handler.mods = true;

export default handler;
