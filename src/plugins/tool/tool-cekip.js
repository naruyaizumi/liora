/**
 * @file IP lookup command handler
 * @module plugins/tools/cekip
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Looks up IP information for a domain
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Array} args - Command arguments
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Performs IP geolocation lookup for a given domain using ip-api.com.
 * Returns detailed information about the server location.
 *
 * @features
 * - Extracts domain from URLs (removes http://, www.)
 * - Uses ip-api.com free API
 * - Returns comprehensive geolocation data
 * - Handles errors gracefully
 */

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

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["cekip <domain>"];
handler.tags = ["tools"];
handler.command = /^(cekip|ip)$/i;

export default handler;
