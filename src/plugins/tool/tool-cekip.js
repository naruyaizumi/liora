let handler = async (m, { args, usedPrefix, command }) => {
    if (!args[0]) return m.reply(`Enter domain\nEx: ${usedPrefix + command} google.com`);

    const dom = args[0]
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0];

    try {
        const res = await fetch(`http://ip-api.com/json/${dom}`);
        const data = await res.json();

        if (data.status !== "success") return m.reply(`Failed: ${dom}`);

        const txt = `
IP Lookup
IP: ${data.query}
Country: ${data.country} (${data.countryCode})
Region: ${data.regionName} (${data.region})
City: ${data.city}
ZIP: ${data.zip}
Lat/Lon: ${data.lat}, ${data.lon}
ISP: ${data.isp}
Org: ${data.org}
AS: ${data.as}
`.trim();

        await m.reply(txt);
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["cekip"];
handler.tags = ["tools"];
handler.command = /^(cekip|ip)$/i;

export default handler;
