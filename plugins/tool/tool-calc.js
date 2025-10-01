let handler = async (m, { text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(
            `🍜 *Masukkan ekspresi matematika!*\n\n*Contoh: ${usedPrefix + command} (2+3)^2%*\n*${usedPrefix + command} 50% + 20*`
        );
    }
    try {
        let expr = text
            .replace(/×/g, "*")
            .replace(/÷/g, "/")
            .replace(/\^/g, "**")
            .replace(/%/g, "/100")
            .replace(/π|pi/gi, "Math.PI")
            .replace(/\be\b/gi, "Math.E");
        if (!/^[0-9+\-*/().\sMathPIE]+$/.test(expr)) {
            return m.reply(
                `🍩 *Ekspresi mengandung karakter ilegal!*\n\n*Coba contoh valid:*\n*${usedPrefix + command} (10+5)%*`
            );
        }
        let result = Function(`"use strict"; return (${expr})`)();
        if (typeof result !== "number" || !isFinite(result)) {
            return m.reply("🍱 *Ekspresi tidak valid atau hasil tidak terdefinisi!*");
        }
        m.reply(`📐 *Hasil perhitungan:*\n\n*${text} = ${result}*`);
    } catch (e) {
        console.error(e);
        m.reply(
            `❌ *Format salah! Gunakan angka dan simbol -, +, *, /, ×, ÷, ^, %, π, e, (, )*\n*Contoh: ${usedPrefix + command} (2+3)^3*`
        );
    }
};

handler.help = ["calculator"];
handler.tags = ["tools"];
handler.command = /^(c|calc(ulat(e|or))?|kalk(ulator)?)$/i;

export default handler;
