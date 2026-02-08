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
 * @param {Object} sock - Connection object
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
 * - Plugin statistics (total features)
 */
import os from "os";

const CATS = ["downloader", "group", "info", "maker", "owner", "tools"];
const META = {
    downloader: "Downloader",
    group: "Group",
    info: "Info",
    maker: "Maker",
    owner: "Owner",
    tools: "Tools",
};

let handler = async (m, { sock, usedPrefix, command, args }) => {
    await global.loading(m, sock);
    
    try {
        const pkg = await getPkg();
        const help = getHelp();
        const inp = (args[0] || "").toLowerCase();
        const time = new Date().toTimeString().split(" ")[0];
        
        if (inp === "all") {
            return await all(sock, m, help, usedPrefix, time);
        }
        
        if (!inp) {
            return await main(sock, m, pkg, usedPrefix, time);
        }
        
        const idx = parseInt(inp) - 1;
        const cat = !isNaN(idx) && CATS[idx] ? CATS[idx] : inp;
        
        if (!CATS.includes(cat)) {
            return m.reply(
                `Invalid category. Use \`${usedPrefix + command}\``);
        }
        
        return await show(sock, m, help, cat, usedPrefix, time);
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, sock, true);
    }
};

/**
 * Displays all commands in one message
 * @async
 * @function all
 * @param {Object} sock - Connection object
 * @param {Object} m - Message object
 * @param {Array} help - Help data array
 * @param {string} prefix - Command prefix
 * @param {string} time - Current time
 * @returns {Promise<void>}
 */
async function all(sock, m, help, prefix, time) {
    const cmds = CATS.map((c) => {
            const list = format(help, c, prefix);
            return list.length > 0 ?
                `\n${META[c]}\n${list.join("\n")}` : "";
        })
        .filter(Boolean)
        .join("\n");
    
    const txt = ["```", `[${time}] All Commands`, "─".repeat(25), cmds, "```"].join("\n");
    
    return sock.sendMessage(
        m.chat,
        {
            text: txt,
            contextInfo: {
                externalAdReply: {
                    title: "All Commands",
                    body: "Complete List",
                    thumbnailUrl: "https://files.catbox.moe/0zhmpq.jpg",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        }, { quoted: m }
    );
}

/**
 * Displays main interactive menu with plugin statistics
 * @async
 * @function main
 * @param {Object} sock - Connection object
 * @param {Object} m - Message object
 * @param {Object} pkg - Package.json data
 * @param {string} prefix - Command prefix
 * @param {string} time - Current time
 * @returns {Promise<void>}
 */
async function main(sock, m, pkg, prefix, time) {
    const upBot = fmt(process.uptime());
    const upSys = fmt(os.uptime());
    
    const ttf = calculate();
    
    const category = CATS.map((c, i) => `${i + 1}. ${META[c]}`).join("\n");
    
    const text = [
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
        "",
        "Plugin Statistics:",
        `Total Features: ${ttf}`,
        "",
        "Categories:",
        category,
        "",
        `Usage: ${prefix}menu [category]`,
        `Example: ${prefix}menu ai`,
        "",
        `Type ${prefix}menu all for all commands`,
        "```",
    ].join("\n");
    
    return sock.sendMessage(
        m.chat,
        {
            text: text,
            contextInfo: {
                externalAdReply: {
                    title: "Liora Menu",
                    body: "WhatsApp Bot",
                    thumbnailUrl: "https://files.catbox.moe/0zhmpq.jpg",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        }, { quoted: m }
    );
}

/**
 * Displays commands for a specific category
 * @async
 * @function show
 * @param {Object} sock - Connection object
 * @param {Object} m - Message object
 * @param {Array} help - Help data array
 * @param {string} cat - Category name
 * @param {string} prefix - Command prefix
 * @param {string} time - Current time
 * @returns {Promise<void>}
 */
async function show(sock, m, help, cat, prefix, time) {
    const cmds = format(help, cat, prefix);
    
    const txt = cmds.length > 0 ? [
        "```",
        `[${time}] ${META[cat]} Commands`,
        "─".repeat(25),
        cmds.join("\n"),
        "─".repeat(25),
        `Total: ${cmds.length}`,
        "```",
    ].join("\n") : `No commands for ${META[cat]}`;
    
    return sock.sendMessage(
        m.chat,
        {
            text: txt,
            contextInfo: {
                externalAdReply: {
                    title: `${META[cat]} Commands`,
                    body: "WhatsApp Bot",
                    thumbnailUrl: "https://files.catbox.moe/0zhmpq.jpg",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        }, { quoted: m }
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
 * Calculates total features/commands
 * @function calculate
 * @returns {number} Total number of features
 */
function calculate() {
    const plugins = Object.values(global.plugins);
    return plugins.reduce((sum, plugin) => {
        return sum + (plugin.help ? plugin.help.length : 0);
    }, 0);
}

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
        [d && `${d}d`, h % 24 && `${h % 24}h`, m % 60 && `${m % 60}m`]
        .filter(Boolean).join(" ") ||
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