import os from "os";
import { readFile } from "fs/promises";

const CATEGORIES = ["ai", "downloader", "group", "info", "internet", "maker", "owner", "tools"];

const MENU_META = {
    ai: "AI",
    downloader: "Downloader",
    group: "Group",
    info: "Information",
    internet: "Internet",
    maker: "Maker",
    owner: "Owner",
    tools: "Tools",
};

let handler = async (m, { conn, usedPrefix, command, args }) => {
    await global.loading(m, conn);

    try {
        const pkg = await getPackageInfo();
        const help = getPluginHelp();
        const input = (args[0] || "").toLowerCase();
        const timestamp = new Date().toTimeString().split(" ")[0];

        if (input === "all") {
            return await allCommands(conn, m, help, usedPrefix, timestamp);
        }

        if (!input) {
            return await mainMenu(conn, m, pkg, usedPrefix, command, timestamp);
        }

        const idx = parseInt(input) - 1;
        const categoryName = !isNaN(idx) && CATEGORIES[idx] ? CATEGORIES[idx] : input;

        if (!CATEGORIES.includes(categoryName)) {
            return m.reply(
                `Invalid category. Use \`${usedPrefix + command}\` to see available categories.`
            );
        }

        return await showCategory(conn, m, help, categoryName, usedPrefix, timestamp);
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

async function allCommands(conn, m, help, usedPrefix, timestamp) {
    const allCmds = CATEGORIES.map((cat) => {
        const cmds = formatCommandList(help, cat, usedPrefix);
        return cmds.length > 0 ? `\n${MENU_META[cat]}\n${cmds.join("\n")}` : "";
    })
        .filter(Boolean)
        .join("\n");

    const text = [
        "```",
        `[${timestamp}] All Commands`,
        "────────────────────────────",
        allCmds,
        "```",
    ].join("\n");

    return conn.sendMessage(
        m.chat,
        {
            text,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363144038483540@newsletter",
                    newsletterName: "mkfs.ext4 /dev/naruyaizumi",
                },
                externalAdReply: {
                    title: "All Commands",
                    body: "Complete Command List",
                    thumbnailUrl: "https://qu.ax/TLqUB.png",
                    sourceUrl: "https://linkbio.co/naruyaizumi",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: q() }
    );
}

async function mainMenu(conn, m, pkg, usedPrefix, command, timestamp) {
    const uptimeBot = formatTime(process.uptime());
    const uptimeSys = formatTime(os.uptime());

    const caption = [
        "```",
        `[${timestamp}] Liora Environment`,
        "────────────────────────────",
        `Name       : ${pkg.name}`,
        `Version    : ${pkg.version}`,
        `License    : ${pkg.license}`,
        `Type       : ${pkg.type}`,
        `Runtime    : Node.js ${process.version}`,
        `VPS Uptime : ${uptimeSys}`,
        `Bot Uptime : ${uptimeBot}`,
        "",
        `Owner      : ${pkg.author?.name || "Naruya Izumi"}`,
        `Social     : https://linkbio.co/naruyaizumi`,
        "────────────────────────────",
        "Select a category below to view commands",
        "```",
    ].join("\n");

    const sections = [
        {
            title: "Command Categories",
            rows: CATEGORIES.map((cat) => ({
                title: MENU_META[cat],
                description: `View ${MENU_META[cat]} commands`,
                id: `${usedPrefix + command} ${cat}`,
            })),
        },
        {
            title: "Other Options",
            rows: [
                {
                    title: "All Commands",
                    description: "View all commands at once",
                    id: `${usedPrefix + command} all`,
                },
            ],
        },
    ];

    return await conn.sendButton(
        m.chat,
        {
            product: {
                productImage: { url: "https://files.catbox.moe/1moinz.jpg" },
                productId: "25015941284694382",
                title: "Liora Menu",
                description: "WhatsApp Bot Command Menu",
                currencyCode: "USD",
                priceAmount1000: "0",
                retailerId: global.config.author,
                url: "https://wa.me/p/25015941284694382/6283143663697",
                productImageCount: 1,
            },
            businessOwnerJid: "113748182302861@lid",
            caption,
            title: "Liora Menu",
            footer: global.config.watermark || "Liora WhatsApp Bot",
            interactiveButtons: [
                {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "Select Category",
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
        { quoted: q() }
    );
}

async function showCategory(conn, m, help, category, usedPrefix, timestamp) {
    const cmds = formatCommandList(help, category, usedPrefix);

    const text =
        cmds.length > 0
            ? [
                  "```",
                  `[${timestamp}] ${MENU_META[category]} Commands`,
                  "────────────────────────────",
                  cmds.join("\n"),
                  "────────────────────────────",
                  `Total: ${cmds.length} commands`,
                  "```",
              ].join("\n")
            : `No commands found for ${MENU_META[category]} category.`;

    return conn.sendMessage(
        m.chat,
        {
            text,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363144038483540@newsletter",
                    newsletterName: "mkfs.ext4 /dev/naruyaizumi",
                },
                externalAdReply: {
                    title: `${MENU_META[category]} Commands`,
                    body: `${cmds.length} commands available`,
                    thumbnailUrl: "https://qu.ax/TLqUB.png",
                    sourceUrl: "https://linkbio.co/naruyaizumi",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: q() }
    );
}

handler.help = ["menu"];
handler.tags = ["info"];
handler.command = /^(menu|help)$/i;

export default handler;

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    return (
        [d && `${d}d`, h % 24 && `${h % 24}h`, m % 60 && `${m % 60}m`].filter(Boolean).join(" ") ||
        "0m"
    );
}

async function getPackageInfo() {
    try {
        const packageJsonPath = `${process.cwd()}/package.json`;
        const data = await readFile(packageJsonPath, "utf-8");
        return JSON.parse(data);
    } catch (e) {
        conn.logger.error(e);
        return {
            name: "Unknown",
            version: "?",
            type: "?",
            license: "?",
            author: { name: "Unknown" },
        };
    }
}

function getPluginHelp() {
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

function formatCommandList(help, category, usedPrefix) {
    return help
        .filter((p) => p.tags.includes(category))
        .flatMap((p) =>
            p.help.map((cmd) => {
                const badge = p.mods
                    ? " (developer)"
                    : p.owner
                      ? " (owner)"
                      : p.admin
                        ? " (admin)"
                        : "";
                return `- ${usedPrefix + cmd}${badge}`;
            })
        );
}

function q() {
    const vcard = `BEGIN:VCARD
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
                vcard,
            },
        },
    };
}
