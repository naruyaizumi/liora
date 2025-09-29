import os from "os";
import fs from "fs";

const defaultMenu = {
    before: `
🍓 *I N F O   U S E R* 🍓
────────────────────────
🍩 *Nama: %name*
🧁 *Status: %status*

🍓 *I N F O  C O M M A N D* 🍓
────────────────────────
*🅟 = Premium*
*🅐 = Admin*
*🅓 = Developer*
*🅞 = Owner*
`.trimStart(),
    header: `*%category*
────────────────────────`,
    body: `*%cmd* %isPremium %isAdmin %isMods %isOwner`,
    footer: `────────────────────────`,
    after: `🍰 *Copyright © Naruya Izumi 2024*`,
};
let handler = async (m, { conn, usedPrefix, command, isOwner, isMods, isPrems, args }) => {
    try {
        await global.loading(m, conn);
        let tags;
        let teks = `${args[0]}`.toLowerCase();
        let arrayMenu = [
            "all",
            "ai",
            "downloader",
            "group",
            "info",
            "internet",
            "maker",
            "owner",
            "islam",
            "server",
            "tools",
        ];
        if (!arrayMenu.includes(teks)) teks = "404";
        if (teks == "all")
            tags = {
                ai: "🧠 AI Menu",
                downloader: "🍥 Downloader Menu",
                group: "🧃 Grup Menu",
                info: "📖 Info Menu",
                internet: "💌 Internet Menu",
                maker: "🎀 Maker Menu",
                owner: "🪄 Owner Menu",
                islam: "🍃️ Islami Menu",
                server: "🖥️ Server Menu",
                tools: "🧸 Tools Menu",
            };
        if (teks == "ai") tags = { ai: "🧠 AI Menu" };
        if (teks == "downloader") tags = { downloader: "🍥 Downloader Menu" };
        if (teks == "group") tags = { group: "🧃 Grup Menu" };
        if (teks == "info") tags = { info: "📖 Info Menu" };
        if (teks == "internet") tags = { internet: "💌 Internet Menu" };
        if (teks == "maker") tags = { maker: "🎀 Maker Menu" };
        if (teks == "owner") tags = { owner: "🪄 Owner Menu" };
        if (teks == "islam") tags = { islam: "🍃️ Islami Menu" };
        if (teks == "server") tags = { server: "🖥️ Server Menu" };
        if (teks == "tools") tags = { tools: "🧸 Tools Menu" };
        let name = conn.getName(m.sender);
        let status = isMods
            ? "🧁 Developer"
            : isOwner
              ? "🪄 Owmer"
              : isPrems
                ? "💖 Ptemium User"
                : "🍬 Free User";
        let vcard = `BEGIN:VCARD
VERSION:3.0
N:;ttname;;;
FN:ttname
item1.TEL;waid=13135550002:+1 (313) 555-0002
item1.X-ABLabel:Ponsel
END:VCARD`;
        let q = {
            key: {
                fromMe: false,
                participant: "13135550002@s.whatsapp.net",
                remoteJid: "status@broadcast",
            },
            message: {
                contactMessage: {
                    displayName: "𝗟 𝗜 𝗢 𝗥 𝗔 - 𝗕 𝗢 𝗧",
                    vcard,
                },
            },
        };
        let member = Object.keys(global.db.data.users)
            .filter(
                (v) =>
                    typeof global.db.data.users[v].commandTotal != "undefined" && v != conn.user.jid
            )
            .sort((a, b) => {
                const totalA = global.db.data.users[a].command;
                const totalB = global.db.data.users[b].command;
                return totalB - totalA;
            });
        const icons = ["🍓", "🍒", "🧁", "🍩", "🍪", "🍧", "🍡", "🍮", "🍫", "🍬", "🍭"];
        let commandToday = 0;
        for (let number of member) {
            commandToday += global.db.data.users[number].command;
        }
        let totalf = Object.values(global.plugins)
            .filter((v) => Array.isArray(v.help))
            .reduce((acc, v) => acc + v.help.length, 0);
        let uptime = formatUptime(process.uptime());
        let muptime = formatUptime(os.uptime());
        let timeID = new Intl.DateTimeFormat("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).format(new Date());
        let subtitle = `🕒 ${timeID}`;
        const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
        const Version = packageJson.version;
        const mode = global.opts.self ? "Private" : "Public";
        let listCmd = `
🍓 *I N F O   B O T* 🍓
────────────────────────
🧁 *Name: ${conn.user.name}*
🍒 *Version: ${Version}*
🍡 *Mode Bot: ${mode}*
🍩 *Database: ${bytesToMB(fs.readFileSync("./database.db").byteLength)} Mb*
🍧 *Uptime: ${uptime}*
🍮 *Machine Uptime: ${muptime}*
🍫 *Command Today: ${commandToday}*
────────────────────────
`.trimStart();
        let lists = arrayMenu.map((v, i) => {
            let icon = icons[i] || "⭐";
            return {
                title: `${icon} Menu ${capitalize(v)}`,
                description: `${icon} Fitur ${v} siap dipakai 🚀`,
                id: `${usedPrefix + command} ${v}`,
            };
        });
        if (teks == "404") {
            return await conn.sendMessage(
                m.chat,
                {
                    document: { url: "https://files.cloudkuimages.guru/images/9e9c94dc0838.jpg" },
                    mimetype: "application/pdf",
                    fileName: `🌸 ${global.config.watermark}`,
                    fileLength: 0,
                    pageCount: 0,
                    caption: listCmd,
                    footer: global.config.author,
                    title: wish(),
                    contextInfo: {
                        externalAdReply: {
                            title: global.config.author,
                            body: subtitle,
                            mediaType: 1,
                            thumbnailUrl: "https://files.cloudkuimages.guru/images/9e9c94dc0838.jpg",
                            sourceUrl: global.config.website,
                            renderLargerThumbnail: true,
                        },
                    },
                    interactive: [
                        {
                            name: "single_select",
                            buttonParamsJson: JSON.stringify({
                                title: "🍭 𝗣𝗶𝗹𝗶𝗵 𝗱𝗶 𝗦𝗶𝗻𝗶~",
                                sections: [
                                    {
                                        title: `📑 Fitur Bot Tersedia ${totalf}`,
                                        rows: lists,
                                    },
                                ],
                            }),
                        },
                        {
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: "🍧 𝗜𝗻𝗳𝗼 𝗦𝗰𝗿𝗶𝗽𝘁",
                                id: ".sc",
                            }),
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "🎐 𝗞𝗼𝗻𝘁𝗮𝗸 𝗢𝘄𝗻𝗲𝗿",
                                url: global.config.website,
                                merchant_url: global.config.website,
                            }),
                        },
                    ],
                    hasMediaAttachment: false,
                },
                { quoted: q }
            );
        }
        let help = Object.values(global.plugins)
            .filter((plugin) => !plugin.disabled)
            .map((plugin) => {
                return {
                    help: Array.isArray(plugin.tags) ? plugin.help : [plugin.help],
                    tags: Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags],
                    prefix: "customPrefix" in plugin,
                    premium: plugin.premium,
                    mods: plugin.mods,
                    owner: plugin.owner,
                    admin: plugin.admin,
                    enabled: !plugin.disabled,
                };
            });
        let groups = {};
        for (let tag in tags) {
            groups[tag] = [];
            for (let plugin of help)
                if (plugin.tags && plugin.tags.includes(tag))
                    if (plugin.help) groups[tag].push(plugin);
        }
        conn.menu = conn.menu ? conn.menu : {};
        let before = conn.menu.before || defaultMenu.before;
        let header = conn.menu.header || defaultMenu.header;
        let body = conn.menu.body || defaultMenu.body;
        let footer = conn.menu.footer || defaultMenu.footer;
        let after =
            conn.menu.after ||
            (conn.user.jid == global.conn.user.jid
                ? ""
                : `*Powered by https://wa.me/${global.conn.user.jid.split`@`[0]}*`) +
                defaultMenu.after;
        let _text = [
            before,
            ...Object.keys(tags).map((tag) => {
                return (
                    header.replace(/%category/g, tags[tag]) +
                    "\n" +
                    [
                        ...help
                            .filter((menu) => menu.tags && menu.tags.includes(tag) && menu.help)
                            .map((menu) => {
                                return menu.help
                                    .map((help) => {
                                        return body
                                            .replace(/%cmd/g, menu.prefix ? help : "%p" + help)
                                            .replace(/%isPremium/g, menu.premium ? "🅟" : "")
                                            .replace(/%isAdmin/g, menu.admin ? "🅐" : "")
                                            .replace(/%isMods/g, menu.mods ? "🅓" : "")
                                            .replace(/%isOwner/g, menu.owner ? "🅞" : "")
                                            .trim();
                                    })
                                    .join("\n");
                            }),
                        footer,
                    ].join("\n")
                );
            }),
            after,
        ].join("\n");
        let text =
            typeof conn.menu == "string" ? conn.menu : typeof conn.menu == "object" ? _text : "";
        let replace = {
            "%": "%",
            p: usedPrefix,
            name,
            status,
        };
        text = text.replace(
            new RegExp(
                `%(${Object.keys(replace).sort((a, b) => b.length - a.length).join`|`})`,
                "g"
            ),
            (_, name) => "" + replace[name]
        );
        await conn.sendMessage(
            m.chat,
            {
                document: { url: "https://files.cloudkuimages.guru/images/9e9c94dc0838.jpg" },
                mimetype: "application/pdf",
                fileName: `🌸 ${global.config.watermark}.pdf`,
                fileLength: 0,
                pageCount: 0,
                caption: text.trim(),
                footer: global.config.author,
                title: wish(),
                contextInfo: {
                    externalAdReply: {
                        title: global.config.author,
                        body: subtitle,
                        mediaType: 1,
                        thumbnailUrl: "https://files.cloudkuimages.guru/images/9e9c94dc0838.jpg",
                        sourceUrl: global.config.website,
                        renderLargerThumbnail: true,
                    },
                },
                interactive: [
                    {
                        name: "single_select",
                        buttonParamsJson: JSON.stringify({
                            title: "🌥️ 𝗠𝗲𝗻𝘂 𝗟𝗮𝗶𝗻𝘆𝗮 ~",
                            sections: [
                                {
                                    title: `📑 Fitur Bot Tersedia ${totalf}`,
                                    rows: lists,
                                },
                            ],
                        }),
                    },
                ],
                hasMediaAttachment: false,
            },
            { quoted: q }
        );
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["menu"];
handler.command = /^(menu|help)$/i;

export default handler;

function formatUptime(seconds) {
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let days = Math.floor(hours / 24);
    let months = Math.floor(days / 30);
    let years = Math.floor(months / 12);
    minutes %= 60;
    hours %= 24;
    days %= 30;
    months %= 12;
    let result = [];
    if (years) result.push(`${years} tahun`);
    if (months) result.push(`${months} bulan`);
    if (days) result.push(`${days} hari`);
    if (hours) result.push(`${hours} jam`);
    if (minutes || result.length === 0) result.push(`${minutes} menit`);
    return result.join(" ");
}

function wish() {
    let time = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    let hours = time.getHours();
    let minutes = time.getMinutes();
    let quarter = Math.floor(minutes / 15);
    const messages = {
        0: [
            "🍩 Udah tengah malam, bobo yuk~",
            "🧁 Jangan begadang, sayangin badanmu~",
            "🍓 Malem sunyi, enaknya tidur~",
        ],
        1: [
            "🍡 Udah jam 1, waktunya bobo~",
            "🍧 Mata udah berat, ayo tidur~",
            "🍮 Mimpi indah yaa~",
        ],
        2: [
            "🍫 Jam 2 pagi? Jangan lupa istirahat~",
            "🍩 Udah larut, bobo yuk~",
            "🍒 Nyaman tidur jam segini~",
        ],
        3: [
            "🍓 Jam 3, waktunya bobo cantik~",
            "🧁 Istirahat biar segar besok~",
            "🍡 Tidur nyenyak enak banget~",
        ],
        4: [
            "🌸 Subuh adem, semangat bangun~",
            "🍵 Waktunya teh hangat~",
            "🍓 Pagi cerah, ayo olahraga~",
        ],
        5: ["🐓 Ayam berkokok, bangun yuk~", "🍞 Sarapan biar kuat~", "🍯 Selamat pagi manis~"],
        6: ["🍎 Olahraga pagi dulu yuk~", "🍫 Semangat kerja/kelas~", "☀️ Pagi cerah bikin happy~"],
        7: ["☕ Ngopi dulu biar melek~", "🍪 Yuk fokus kerjaan~", "🍩 Pagi produktif yaa~"],
        8: ["🍒 Cemilan pagi biar kuat~", "🥤 Jangan lupa minum ya~", "🍱 Siang sebentar lagi~"],
        9: [
            "🍚 Selamat siang, makan yuk~",
            "🍛 Lagi makan apa nih~",
            "🍮 Habis makan santai bentar~",
        ],
        10: [
            "🍵 Siang panas, minum ya~",
            "🍫 Jangan lupa fokus lagi~",
            "🍧 Es teh siang enak bgt~",
        ],
        11: [
            "🍩 Sore mendekat, cepet selesain kerja~",
            "🍪 Ngemil sore seru~",
            "🌸 Langit cantik bgt~",
        ],
        12: [
            "🍚 Udah jam 12, makan siang yuk~",
            "🍲 Jangan skip makan siang~",
            "🍵 Istirahat bentar habis makan~",
        ],
        13: ["🍧 Siang panas, minum yang segar~", "🍹 Jangan lupa hidrasi~", "🍉 Siang terik nih~"],
        14: ["🍫 Siang enaknya ngemil~", "🥤 Waktunya minum segar~", "📖 Santai bentar yuk~"],
        15: [
            "🍪 Udah sore, stretching dikit~",
            "🍩 Ngemil cookies enak nih~",
            "🌇 Langit sore cakep bgt~",
        ],
        16: [
            "🍵 Teh sore + camilan perfect~",
            "🍰 Santai sambil nonton~",
            "📸 Foto langit sore yuk~",
        ],
        17: [
            "🍽️ Udah sore, siap2 makan malam~",
            "🍲 Mau makan apa malam ini?~",
            "🌅 Sore adem banget~",
        ],
        18: ["🍛 Jangan lupa makan malam~", "🍫 Malam tenang banget~", "📺 Nonton santai yuk~"],
        19: ["🎶 Malam asik sambil musik~", "📱 Sosmed-an bentar~", "🎮 Main game santai~"],
        20: ["🍵 Skincare + relax time~", "📖 Baca buku sebelum tidur~", "🛌 Jam 8, siap tidur~"],
        21: ["🍒 Jangan begadang, bobo yuk~", "🧁 Tidur awal biar fresh~", "🌙 Malem nyenyak yaa~"],
        22: ["🍩 Jangan lupa matiin lampu~", "✨ Mimpi indah ya~", "🛌 Tidur cukup itu penting~"],
        23: [
            "💤 Udah tengah malam, bobo nyenyak~",
            "🍓 Jangan begadang terus~",
            "🍮 Selamat malam, mimpi manis~",
        ],
    };
    let message = messages[hours]?.[quarter] || messages[hours]?.[3] || "✨ Waktu berjalan terus~";
    return `*${message}*`;
}

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.substr(1);
}

function bytesToMB(bytes) {
    return (bytes / 1048576).toFixed(2);
}