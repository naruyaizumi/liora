const languages = {
    1: ["id-ID", "🇮🇩 Indonesia"],
    2: ["en-US", "🇺🇸 English"],
    3: ["ja-JP", "🇯🇵 Japanese"],
    4: ["fr-FR", "🇫🇷 French"],
    5: ["fil-PH", "🇵🇭 Filipino"],
    6: ["my-MM", "🇲🇲 Burmese"],
    7: ["de-DE", "🇩🇪 German"],
    8: ["it-IT", "🇮🇹 Italian"],
    9: ["ko-KR", "🇰🇷 Korean"],
    10: ["th-TH", "🇹🇭 Thai"],
    11: ["hi-IN", "🇮🇳 Hindi"],
    12: ["ru-RU", "🇷🇺 Russian"],
};

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        let list = Object.entries(languages)
            .map(([num, [code, name]]) => `*${num}. ${name} (${code})*`)
            .join("\n");

        return m.reply(`🍬 *Pilih bahasa dengan angka + teksnya*\n📌 *Contoh: ${usedPrefix + command} 1 Halo Izumi*\n\n🍡 *Daftar Bahasa TTS:*\n${list}`
        );
    }

    let num = parseInt(args[0]);
    if (!languages[num]) return m.reply("🍡 *Nomor bahasa tidak valid!*");

    let [langCode] = languages[num];
    let text = args.slice(1).join(" ");
    if (!text) return m.reply("🍥 *Teksnya mana?*");

    await global.loading(m, conn);
    try {
        const apiUrl = global.API(
            "btz",
            "/api/sound/texttosound",
            { text1: text, lang: langCode },
            "apikey"
        );
        const res = await fetch(apiUrl, { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        const fileUrl = json.result || json.url;
        if (!fileUrl) throw new Error("No result URL from API");

        await conn.sendFile(m.chat, fileUrl, "tts.mp3", "", m, true, {
            mimetype: "audio/mpeg",
            ptt: true,
        });
    } catch (e) {
        console.error(e);
        m.reply("🍥 *Error saat membuat suara!*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tts"];
handler.tags = ["tools"];
handler.command = /^(tts)$/i;

export default handler;