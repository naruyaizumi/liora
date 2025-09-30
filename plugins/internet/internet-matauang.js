let handler = async (m, { text, usedPrefix, command }) => {
    if (!text) return m.reply(`🍩 *Contoh: ${usedPrefix + command} 100000 usd*`);
    let [jumlah, mataUang] = text.trim().split(/\s+/);
    if (!jumlah || !mataUang || isNaN(jumlah))
        return m.reply(`🍧 *Format salah!*\n*Gunakan: ${usedPrefix + command} 100000 usd*`);
    let targets = ["IDR", "USD", "MYR"];
    await global.loading(m);
    try {
        let hasil = `🍓 *Konversi ${jumlah} ${mataUang.toUpperCase()}* 🍓\n━━━━━━━━━━━━━━━━━━━\n`;
        for (let to of targets) {
            if (to.toLowerCase() === mataUang.toLowerCase()) continue;
            let res = await fetch(
                global.API(
                    "btz",
                    "/api/tools/cvuang",
                    {
                        from: mataUang.toUpperCase(),
                        to,
                        jumlah,
                    },
                    "apikey"
                )
            );
            let json = await res.json();
            if (!json.status || json.result.status !== "SUCCESS") continue;
            let r = json.result.data;
            hasil += `💱 *${to}: ${r.originalValues.toAmountWithVisaRate}*\n`;
        }
        hasil += "━━━━━━━━━━━━━━━━━━━";
        await m.reply(hasil);
    } catch (e) {
        console.error(e);
        m.reply("❌ *Gagal melakukan konversi. Coba lagi nanti ya* 🍬");
    } finally {
        await global.loading(m, null, true);
    }
};

handler.help = ["matauang"];
handler.tags = ["internet"];
handler.command = /^(matauang|konversi)$/i;

export default handler;
