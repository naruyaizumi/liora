import { unsuspendServer, unsuspendAllServers } from "../../lib/server.js";

let handler = async (m, { conn, args }) => {
    const domain = global.config.domain;
    const apikey = global.config.apikey;
    const unsuspendAll = args[0] === "all";
    try {
        if (unsuspendAll) {
            const results = await unsuspendAllServers(domain, apikey);
            if (!results.length)
                return conn.sendMessage(
                    m.chat,
                    { text: "🍩 *Tidak ada server yang perlu di-unsuspend!*" },
                    { quoted: m }
                );
            let reportText = "📋 *`𝙐𝙉𝙎𝙐𝙎𝙋𝙀𝙉𝘿 𝙍𝙀𝙋𝙊𝙍𝙏 - 𝘼𝙇𝙇`* 📋\n";
            results.forEach((r) => {
                reportText += r.success
                    ? `🍰 *${r.name} ID: ${r.id} - UNSUSPENDED*\n`
                    : `🍬 *${r.name} ID: ${r.id} - FAILED*\n`;
            });
            return conn.sendMessage(m.chat, { text: reportText }, { quoted: m });
        }
        const srv = args[0];
        if (!srv) return m.reply("🍩 *Mohon masukkan ID Server yang valid!*");
        const result = await unsuspendServer(domain, apikey, srv);
        if (result.alreadyActive) {
            return m.reply(`🍰 *Server dengan ID ${srv} sudah aktif sebelumnya!*`);
        }
        let reportText = `📋 *\`𝙐𝙉𝙎𝙐𝙎𝙋𝙀𝙉𝘿 𝙍𝙀𝙋𝙊𝙍𝙏 - 𝙄𝘿\`* 📋
🍪 *Server Name:* ${result.name}
🍩 *Server ID:* ${srv}
${result.success ? "🍰 *Status: UNSUSPENDED*" : "🍬 *Status: FAILED*"}`;
        return conn.sendMessage(m.chat, { text: reportText }, { quoted: m });
    } catch (e) {
        console.error(e);
        m.reply(`❌ *Terjadi kesalahan:* ${e.message}`);
    }
};

handler.help = ["unsuspend"];
handler.tags = ["server"];
handler.command = /^(unsuspend|us)$/i;
handler.owner = true;

export default handler;
