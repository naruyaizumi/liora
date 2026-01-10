/**
 * @file Menu/Help command handler
 * @module plugins/info/menu
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Displays interactive bot menu and command help
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @param {Array} args - Command arguments
 * @returns {Promise<void>}
 *
 * @description
 * Interactive menu system for the bot that displays commands categorized by functionality.
 * Shows bot information, uptime, system status, and organized command lists.
 *
 * @features
 * - Interactive menu with category selection
 * - Shows bot information and uptime
 * - Categorized command lists (AI, Downloader, Group, etc.)
 * - View all commands at once option
 * - Interactive buttons for navigation
 * - Contact card with bot details
 * - External advertisement integration
 */

import os from "os";

const CATS = ["ai", "downloader", "group", "info", "internet", "maker", "owner", "tools"];

const META = {
    ai: "AI",
    downloader: "Downloader",
    group: "Group",
    info: "Info",
    internet: "Internet",
    maker: "Maker",
    owner: "Owner",
    tools: "Tools",
};

let handler = async (m, { conn, usedPrefix, command, args }) => {
    await global.loading(m, conn);

    try {
        const pkg = await getPkg();
        const help = getHelp();
        const inp = (args[0] || "").toLowerCase();
        const time = new Date().toTimeString().split(" ")[0];

        if (inp === "all") {
            return await all(conn, m, help, usedPrefix, time);
        }

        if (!inp) {
            return await main(conn, m, pkg, usedPrefix, command, time);
        }

        const idx = parseInt(inp) - 1;
        const cat = !isNaN(idx) && CATS[idx] ? CATS[idx] : inp;

        if (!CATS.includes(cat)) {
            return m.reply(`Invalid category. Use \`${usedPrefix + command}\``);
        }

        return await show(conn, m, help, cat, usedPrefix, time);
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

/**
 * Displays all commands in one message
 * @async
 * @function all
 * @param {Object} conn - Connection object
 * @param {Object} m - Message object
 * @param {Array} help - Help data array
 * @param {string} prefix - Command prefix
 * @param {string} time - Current time
 * @returns {Promise<void>}
 */
async function all(conn, m, help, prefix, time) {
    const cmds = CATS.map((c) => {
        const list = format(help, c, prefix);
        return list.length > 0 ? `\n${META[c]}\n${list.join("\n")}` : "";
    })
        .filter(Boolean)
        .join("\n");

    const txt = ["```", `[${time}] All Commands`, "─".repeat(25), cmds, "```"].join("\n");

    return conn.sendMessage(
        m.chat,
        {
            text: txt,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                    title: "All Commands",
                    body: "Complete List",
                    thumbnailUrl: "https://qu.ax/TLqUB.png",
                    sourceUrl: "https://linkbio.co/naruyaizumi",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: await q() }
    );
}

/**
 * Displays main interactive menu
 * @async
 * @function main
 * @param {Object} conn - Connection object
 * @param {Object} m - Message object
 * @param {Object} pkg - Package.json data
 * @param {string} prefix - Command prefix
 * @param {string} cmd - Command name
 * @param {string} time - Current time
 * @returns {Promise<void>}
 */
async function main(conn, m, pkg, prefix, cmd, time) {
    const upBot = fmt(process.uptime());
    const upSys = fmt(os.uptime());

    const cap = [
        "```",
        `[${time}] Liora`,
        "─".repeat(25),
        `Name    : ${pkg.name}`,
        `Version : ${pkg.version}`,
        `License : ${pkg.license}`,
        `Type    : ${pkg.type}`,
        `Runtime : Bun ${Bun.version}`,
        `VPS Up  : ${upSys}`,
        `Bot Up  : ${upBot}`,
        "",
        `Owner   : ${pkg.author?.name || "Naruya Izumi"}`,
        `Social  : https://linkbio.co/naruyaizumi`,
        "─".repeat(25),
        "Select category below",
        "```",
    ].join("\n");

    const sections = [
        {
            title: "Categories",
            highlight_label: "ナルヤ イズミ",
            rows: CATS.map((c) => ({
                title: META[c],
                description: `View ${META[c]} commands`,
                id: `${prefix + cmd} ${c}`,
            })),
        },
        {
            title: "Options",
            highlight_label: "ナルヤ イズミ",
            rows: [
                {
                    title: "All Commands",
                    description: "View all at once",
                    id: `${prefix + cmd} all`,
                },
            ],
        },
    ];

    return await conn.client(
        m.chat,
        {
            product: {
                productImage: { url: "https://files.catbox.moe/1moinz.jpg" },
                productId: "25015941284694382",
                title: "Liora Menu",
                description: "WhatsApp Bot",
                currencyCode: "USD",
                priceAmount1000: 1000000000000000,
                retailerId: global.config.author,
                url: "https://wa.me/p/25015941284694382/6283143663697",
                productImageCount: 1,
            },
            businessOwnerJid: "113748182302861@lid",
            caption: "*© Naruya Izumi 2024 - 2026*",
            title: "Liora Menu",
            footer: cap,
            interactiveButtons: [
                {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "Select",
                        sections,
                    }),
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Script",
                        url: "https://github.com/naruyaizumi/liora",
                    }),
                },
            ],
            hasMediaAttachment: false,
        },
        { quoted: await q() }
    );
}

/**
 * Displays commands for a specific category
 * @async
 * @function show
 * @param {Object} conn - Connection object
 * @param {Object} m - Message object
 * @param {Array} help - Help data array
 * @param {string} cat - Category name
 * @param {string} prefix - Command prefix
 * @param {string} time - Current time
 * @returns {Promise<void>}
 */
async function show(conn, m, help, cat, prefix, time) {
    const cmds = format(help, cat, prefix);

    const txt =
        cmds.length > 0
            ? [
                  "```",
                  `[${time}] ${META[cat]} Commands`,
                  "─".repeat(25),
                  cmds.join("\n"),
                  "─".repeat(25),
                  `Total: ${cmds.length}`,
                  "```",
              ].join("\n")
            : `No commands for ${META[cat]}`;

    return conn.sendMessage(
        m.chat,
        {
            text: txt,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                    title: `${META[cat]} Commands`,
                    body: `${cmds.length} commands`,
                    thumbnailUrl: "https://qu.ax/TLqUB.png",
                    sourceUrl: "https://linkbio.co/naruyaizumi",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: await q() }
    );
}

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["menu"];
handler.tags = ["info"];
handler.command = /^(menu|help)$/i;

export default handler;

/**
 * Formats seconds into human readable time (d, h, m)
 * @function fmt
 * @param {number} sec - Seconds to format
 * @returns {string} Formatted time string
 */
function fmt(sec) {
    const m = Math.floor(sec / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    return (
        [d && `${d}d`, h % 24 && `${h % 24}h`, m % 60 && `${m % 60}m`].filter(Boolean).join(" ") ||
        "0m"
    );
}

/**
 * Reads and returns package.json data
 * @function getPkg
 * @returns {Promise<Object>} Package.json data
 */
function getPkg() {
    try {
        return Bun.file("./package.json").json();
    } catch {
        return {
            name: "Unknown",
            version: "?",
            type: "?",
            license: "?",
            author: { name: "Unknown" },
        };
    }
}

/**
 * Collects help data from all plugins
 * @function getHelp
 * @returns {Array} Array of help objects from all plugins
 */
function getHelp() {
    return Object.values(global.plugins)
        .filter((p) => !p.disabled)
        .map((p) => ({
            help: [].concat(p.help || []),
            tags: [].concat(p.tags || []),
            owner: p.owner,
            mods: p.mods,
            admin: p.admin,
        }));
}

/**
 * Formats commands for a specific category
 * @function format
 * @param {Array} help - Help data array
 * @param {string} cat - Category name
 * @param {string} prefix - Command prefix
 * @returns {Array<string>} Formatted command list
 */
function format(help, cat, prefix) {
    return help
        .filter((p) => p.tags.includes(cat))
        .flatMap((p) =>
            p.help.map((cmd) => {
                const b = p.mods ? " (dev)" : p.owner ? " (owner)" : p.admin ? " (admin)" : "";
                return `- ${prefix + cmd}${b}`;
            })
        );
}

/**
 * Creates a quoted message with contact card
 * @function q
 * @returns {Object} Quoted message object
 */
/*function q() {
    const v = `BEGIN:VCARD
VERSION:3.0
N:;ttname;;;
FN:ttname
item1.TEL;waid=13135550002:+1 (313) 555-0002
item1.X-ABLabel:Ponsel
END:VCARD`;

    return {
        key: {
            fromMe: false,
            participant: "13135550002@s.whatsapp.net",
            remoteJid: "status@broadcast",
        },
        message: {
            contactMessage: {
                displayName: "𝗟 𝗜 𝗢 𝗥 𝗔",
                vcard: v,
            },
        },
    };
}
*/

async function q() {
    return {
        key: {
            fromMe: false,
            participant: `13135550002@s.whatsapp.net`,
            remoteJid: "status@broadcast",
            id: "naruyaizumi"
        },
        message: {
            productMessage: {
                product: {
                    productImage: {
                        mimetype: "image/jpeg",
                        jpegThumbnail: null
                    },
                    title: `𝗟 𝗜 𝗢 𝗥 𝗔`,
                    description: null,
                    currencyCode: "USD",
                    priceAmount1000: 1000000000000000,
                    retailerId: `${global.config.author}`,
                    productImageCount: 1000000000000000
                },
                businessOwnerJid: `13135550002@s.whatsapp.net`
            }
        }
    };
}