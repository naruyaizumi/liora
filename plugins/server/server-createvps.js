import { createDroplet } from "../../lib/server.js";

let handler = async (m, { args, conn }) => {
    try {
        const token = global.config.token;
        if (!token) return m.reply("🍩 *API DigitalOcean belum diset!*");
        const headers = { Authorization: `Bearer ${token}` };
        const regionRes = await fetch("https://api.digitalocean.com/v2/regions", { headers });
        if (!regionRes.ok) throw new Error("🍬 Gagal mengambil data region!");
        const regionData = await regionRes.json();
        const sizeRes = await fetch("https://api.digitalocean.com/v2/sizes", { headers });
        if (!sizeRes.ok) throw new Error("🍬 Gagal mengambil data ukuran!");
        const sizeData = await sizeRes.json();
        const imageRes = await fetch("https://api.digitalocean.com/v2/images?type=distribution", {
            headers,
        });
        if (!imageRes.ok) throw new Error("🍬 Gagal mengambil data OS!");
        const imageData = await imageRes.json();
        if (!args[0]) {
            const caption = `🍓 *Daftar Opsi DigitalOcean* 🍓
━━━━━━━━━━━━━━━━━━━
🍰 *Region:*
${regionData.regions.map((r, i) => `*${i + 1}. ${r.slug} - ${r.name}*`).join("\n")}
━━━━━━━━━━━━━━━━━━━
🧁 *Ukuran (Size):*
${sizeData.sizes.map((s, i) => `*${i + 1}. ${s.slug} - ${s.vcpus} vCPU, ${s.memory}MB RAM*`).join("\n")}
━━━━━━━━━━━━━━━━━━━
🍬 *OS (Image):*
${imageData.images.map((i, idx) => `*${idx + 1}. ${i.slug} - ${i.distribution} ${i.name}*`).join("\n")}
━━━━━━━━━━━━━━━━━━━
🍡 *Gunakan: .cvps nama.region.size.os*
🍡 *Contoh: .cvps izumi.1.6.9*`;
            await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
            return;
        }
        const input = args[0].split(".");
        if (input.length < 4)
            return m.reply("🍩 *Format salah! Gunakan: .cvps nama.region.size.os*");
        const [dropletName, regionIdx, sizeIdx, imageIdx] = input;
        const region = regionData.regions[regionIdx - 1]?.slug;
        const size = sizeData.sizes[sizeIdx - 1]?.slug;
        const image = imageData.images[imageIdx - 1]?.slug;
        if (!region || !size || !image)
            return m.reply("🍬 *Nomor tidak valid! Periksa daftar dengan .cvps*");
        const pass = "NARUYA@1ZUMI";
        await m.reply(
            "🍪 *Sedang membuat VPS... Mohon tunggu beberapa menit sambil sistem menyiapkan IP.*"
        );
        const result = await createDroplet(dropletName, region, size, image, pass, token);
        const caption = `🍓 *VPS Berhasil Dibuat!*  
━━━━━━━━━━━━━━━━━━━
🍰 *Nama: ${dropletName}*
🍬 *Region: ${region}*
🧁 *Spesifikasi: ${size}*
🍪 *OS: ${image}*
🍡 *Password Root: ${pass}*
🍩 *IP Address: ${result.ip || "Belum tersedia, coba cek ulang nanti"}*
🍮 *ID: ${result.id}*
━━━━━━━━━━━━━━━━━━━
⚠️ *Segera login dan ubah password root untuk keamanan!*`;
        await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
    } catch (err) {
        console.error(err);
        m.reply("🍬 *Terjadi kesalahan!* Cek kembali parameter atau API DigitalOcean.");
    }
};

handler.help = ["createvps"];
handler.tags = ["server"];
handler.command = /^(cvps|createvps)$/i;
handler.mods = true;

export default handler;
