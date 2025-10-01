let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) return m.reply(`🍰 *Contoh: ${usedPrefix + command} naruyaizumi*`);
    await global.loading(m, conn);
    try {
        let res = await fetch(global.API("btz", "/api/stalk/npm", { name: text }, "apikey"));
        if (!res.ok) throw "🍬 *Gagal mengakses API.*";
        let json = await res.json();
        if (!json.status || !json.result) throw "🍡 *Paket NPM tidak ditemukan.*";
        let result = json.result;
        let latestVersion = result["dist-tags"]?.latest;
        let data = result.versions?.[latestVersion];
        let caption = `
🍩 *NPM PACKAGE STALK*
🍭 *Nama: ${data.name}*
🍪 *Versi: ${data.version}*
🧁 *Deskripsi: ${data.description || "-"}*
🥧 *Main File: ${data.main || "-"}*

🍫 *Author: ${data.author?.name || "-"}*
🍯 *License: ${data.license || "-"}*

🍦 *Repository: ${data.repository?.url?.replace(/^git\+/, "").replace(/\.git$/, "") || "-"}*
🍬 *Homepage: ${data.homepage || "-"}*
🍡 *Bug Tracker: ${data.bugs?.url || "-"}*

🍮 *Dependencies: ${Object.keys(data.dependencies || {}).join(", ") || "-"}*

🍓 *_npmUser:*
🍬 *Nama: ${data._npmUser?.name || "-"}*
🍬 *Email: ${data._npmUser?.email || "-"}*

🧋 *Maintainers:*
${(result.maintainers || []).map((v) => `*• ${v.name} (${v.email})*`).join("\n") || "-"}

🍰 *Dibuat: ${new Date(result.time?.created).toLocaleDateString("id-ID")}*
🍨 *Diubah: ${new Date(result.time?.modified).toLocaleDateString("id-ID")}*
`.trim();
        m.reply(caption);
    } catch (e) {
        console.error(e);
        m.reply(typeof e === "string" ? e : "🍩 *Gagal memuat info paket NPM.*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["stalknpm"];
handler.tags = ["tools"];
handler.command = /^(npmstalk|stalknpm)$/i;

export default handler;
