import { fetch } from "liora-lib";

let handler = async (m, { conn }) => {
    await global.loading(m, conn);
    let message = ["```", "API Key Information", "──────────────────────"].join("\n");

    try {
        let result = {};
        try {
            const res = await fetch(global.API("btz", "/api/checkkey", {}, "apikey"));
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            const json = await res.json();
            result = json.result || {};
        } catch (err) {
            message += `\nFailed to fetch API data: ${err.message}\n`;
        }

        message += [
            "",
            `Email : ${result.email || "-"}`,
            `Username : ${result.username || "-"}`,
            `Admin : ${result.admin ? "Yes" : "No"}`,
            `Role : ${result.role || "-"}`,
            `Total Hit : ${result.totalHit || "-"}`,
            `Today Hit : ${result.todayHit || "-"}`,
            `Limit : ${result.limit || "-"}`,
            `Expired : ${result.expired || "-"}`,
            "──────────────────────",
            "Use your API key responsibly.",
            "```",
        ].join("\n");

        await conn.sendMessage(m.chat, { text: message }, { quoted: m });
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["cekapikey"];
handler.tags = ["info"];
handler.command = /^(cekapikey|cekapi)$/i;
handler.mods = true;

export default handler;
