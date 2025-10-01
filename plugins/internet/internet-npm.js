let handler = async (m, { conn, text }) => {
    if (!text) return m.reply("Input Query");
    let res = await fetch(`http://registry.npmjs.com/-/v1/search?text=${text}`);
    let { objects } = await res.json();
    if (!objects.length) return m.reply(`*Query "${text}" not found :/*`);
    let txt = objects.map(({ package: pkg }) => {
        return `*${pkg.name} (v${pkg.version})*\n*_${pkg.links.npm}_*`;
    }).join`\n\n`;
    await conn.sendMessage(m.chat, { text: txt }, { quoted: m });
};
handler.help = ["npmsearch"];
handler.tags = ["internet"];
handler.command = /^(npm(js|search)?)$/i;

export default handler;
