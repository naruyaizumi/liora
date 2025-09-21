let handler = async (m, { conn, usedPrefix, command, args }) => {
    try {
        let err = `
🍜 *Contoh penggunaan:*
*${usedPrefix + command} <kode_bahasa> <teks>*

🍙 *Contoh:*
*${usedPrefix + command} en Aku lapar*

🍛 *Daftar kode bahasa:* https://cloud.google.com/translate/docs/languages
`.trim();
        if (!args[0]) return m.reply(err);
        await global.loading(m, conn);
        let lang = args[0];
        let txt = args.length > 1 ? args.slice(1).join(" ") : "";
        let msg = m.quoted ? m.quoted.text : txt;
        if (!msg) return m.reply(err);
        let api = global.API(
            "btz",
            "/api/tools/translate",
            {
                text: msg,
                lang,
            },
            "apikey"
        );
        let res = await fetch(api);
        let json = await res.json();
        if (!json.status || !json.result) throw "🍩 *Gagal menerjemahkan teks.*";
        await m.reply(`🍱 *Hasil Terjemahan:*\n${json.result}`);
    } catch (e) {
        console.error(e);
        m.reply("🍣 *Ups! Terjadi kesalahan saat menerjemahkan~*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["translate"];
handler.tags = ["tools"];
handler.command = /^(tr|translate)$/i;

export default handler;
