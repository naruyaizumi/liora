import { fetch } from "liora-lib";

let handler = async (m, { conn, text }) => {
    if (!text) return m.reply("Usage: npmsearch <package>\nExample: .npmsearch sharp");

    const res = await fetch(
        `https://registry.npmjs.com/-/v1/search?text=${encodeURIComponent(text)}`
    );
    const { objects } = await res.json();

    if (!objects.length) return m.reply(`No results found for "${text}".`);

    const limited = objects.slice(0, 10);
    const timestamp = new Date().toTimeString().split(" ")[0];

    const result = [
        "```",
        `┌─[${timestamp}]────────────`,
        `│  NPM SEARCH RESULT`,
        "└──────────────────────",
        ...limited.map(
            ({ package: pkg }, i) =>
                `${i + 1}. ${pkg.name} (v${pkg.version})\n  ↳ ${pkg.links.npm}`
        ),
        "```",
    ].join("\n");

    await conn.sendMessage(m.chat, { text: result }, { quoted: m });
};

handler.help = ["npmsearch"];
handler.tags = ["internet"];
handler.command = /^(npm(js|search)?)$/i;

export default handler;
