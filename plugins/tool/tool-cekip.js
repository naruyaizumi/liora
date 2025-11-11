let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        return m.reply(`Enter a domain name or URL.\nExample: ${usedPrefix + command} google.com`);
    }

    const domain = args[0]
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0];

    try {
        const res = await fetch(`http://ip-api.com/json/${domain}`);
        const data = await res.json();

        if (data.status !== "success") {
            return m.reply(`Failed to resolve IP for domain: ${domain}`);
        }

        const result = `
Network Lookup
Query: ${data.query}
Country: ${data.country} (${data.countryCode})
Region: ${data.regionName} (${data.region})
City: ${data.city}
ZIP: ${data.zip}
Latitude: ${data.lat}
Longitude: ${data.lon}
Timezone: ${data.timezone}
ISP: ${data.isp}
Org: ${data.org}
AS: ${data.as}
`.trim();

        await m.reply(result);
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["cekip"];
handler.tags = ["tools"];
handler.command = /^(cekip|ip)$/i;

export default handler;
