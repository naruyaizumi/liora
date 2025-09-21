let handler = async (m, { conn, args, usedPrefix, command }) => {
    let who =
        m.mentionedJid && m.mentionedJid[0]
            ? m.mentionedJid[0]
            : m.quoted
              ? m.quoted.sender
              : args[0]
                ? args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net"
                : false;
    if (!who) return m.reply("🍓 *Masukkan nomor atau tag orangnya dulu dong~*");
    if (!global.db.data.users[who])
        return m.reply(`🚫 *User belum terdaftar! Ketik ${usedPrefix}daftar dulu ya~*`);
    let user = global.db.data.users[who];
    let txt = args[1];
    if (!txt) return m.reply("🍰 *Masukkan jumlah hari premium-nya ya sayang~*");
    if (isNaN(txt))
        return m.reply(
            `🥺 *Yang dimasukkan harus angka ya!*\n\n*Contoh: ${usedPrefix + command} @${m.sender.split`@`[0]} 7*`
        );
    let jumlahHari = 86400000 * txt;
    let now = Date.now();
    user.premiumTime = now < user.premiumTime ? user.premiumTime + jumlahHari : now + jumlahHari;
    user.premium = true;
    let timers = user.premiumTime - now;
    let countdown = formatCountdown(timers);
    let capUser = `
🎀 *𝗣𝗿𝗲𝗺𝗶𝘂𝗺 𝗔𝗸𝘁𝗶𝗳!* 🎀
────────────────────────
🍓 *Nama: ${user.name}*
🧁 *Durasi: ${txt} hari*
⏳ *Sisa Waktu: ${countdown}*
────────────────────────
🌷 Nikmati fitur spesial dari Riselia yaa~ semangat petualangannya~!
`.trim();
    await conn.sendMessage(who, { text: capUser }, { quoted: m });
    await m.reply(`🍨 *Sukses menambahkan premium untuk ${user.name} selama ${txt} hari!*`);
};

handler.help = ["addprem"];
handler.tags = ["owner"];
handler.command = /^(add(prem|premium))$/i;
handler.owner = true;

export default handler;

function formatCountdown(ms) {
    let days = Math.floor(ms / 86400000);
    let hours = Math.floor(ms / 3600000) % 24;
    let minutes = Math.floor(ms / 60000) % 60;
    let seconds = Math.floor(ms / 1000) % 60;
    return `${days} hari ${hours} jam ${minutes} menit ${seconds} detik`;
}
