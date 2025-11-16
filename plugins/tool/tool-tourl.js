import {
    uploader1,
    uploader2,
    uploader3,
    uploader4,
    uploader5,
    uploader6,
    uploader7,
    uploader8,
    uploader9,
    uploader,
} from "../../lib/uploader.js";

const uploaders = {
    1: { name: "Catbox.moe", fn: uploader1, info: "Permanent hosting" },
    2: { name: "Uguu.se", fn: uploader2, info: "48 hours retention" },
    3: { name: "Qu.ax", fn: uploader3, info: "Temporary hosting" },
    4: { name: "Put.icu", fn: uploader4, info: "Direct upload" },
    5: { name: "Tmpfiles.org", fn: uploader5, info: "1 hour retention" },
    6: { name: "Nauval.cloud", fn: uploader6, info: "30 minutes default" },
    7: { name: "Deline", fn: uploader7, info: "Deline uploader" },
    8: { name: "Zenitsu", fn: uploader8, info: "Zenitsu uploader" },
    9: { name: "CloudKuImages", fn: uploader9, info: "CloudKuImages uploader" },
};

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        const q = m.quoted && (m.quoted.mimetype || m.quoted.mediaType) ? m.quoted : m;
        const mime = (q.msg || q).mimetype || q.mediaType || "";

        if (!args[0]) {
            if (!mime) {
                const list = Object.entries(uploaders)
                    .map(([num, { name, info }]) => `${num}. ${name} - ${info}`)
                    .join("\n");
                return m.reply(
                    `No media detected.
Reply to a media file or select upload server by number.

Available servers:
${list}

Tip: Reply to media and use .upload for automatic fallback!`
                );
            }

            await global.loading(m, conn);

            const buffer = await q.download?.();
            if (!Buffer.isBuffer(buffer) || !buffer.length) {
                return m.reply("Failed to get media buffer.");
            }

            const sizeKB = (buffer.length / 1024).toFixed(2);
            const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
            const sizeDisplay = buffer.length > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

            const result = await uploader(buffer);
            if (result && result.success) {
                const caption = `File uploaded successfully

Server : ${result.provider}
File Size : ${sizeDisplay}
Attempts : ${result.attempts.length}

URL:
${result.url}`;
                return conn.sendMessage(m.chat, { text: caption }, { quoted: m });
            }

            return m.reply(
                `Upload failed on all servers.\nFile size: ${sizeDisplay}\nPlease try again later or use a different file.`
            );
        }

        if (isNaN(args[0]) || !uploaders[args[0]]) {
            const list = Object.entries(uploaders)
                .map(([num, { name, info }]) => `${num}. ${name} - ${info}`)
                .join("\n");
            return m.reply(
                `Select upload server by number.
Example: ${usedPrefix + command} 1

Available servers:
${list}

Tip: Reply to media and use .upload for automatic fallback!`
            );
        }

        if (!mime) {
            return m.reply("Send or reply to a media file to upload.");
        }

        await global.loading(m, conn);

        const buffer = await q.download?.();
        if (!Buffer.isBuffer(buffer) || !buffer.length) {
            return m.reply("Failed to get media buffer.");
        }

        const sizeKB = (buffer.length / 1024).toFixed(2);
        const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
        const sizeDisplay = buffer.length > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

        const serverNum = args[0];
        const server = uploaders[serverNum];
        let result = await server.fn(buffer);

        if (!result) {
            await conn.sendMessage(
                m.chat,
                { text: `${server.name} failed. Trying other servers...` },
                { quoted: m }
            );

            result = await uploader(buffer);
            if (result && result.success) {
                const caption = `File uploaded successfully

Primary Server : ${server.name} (Failed)
Fallback Server : ${result.provider}
File Size : ${sizeDisplay}

URL:
${result.url}`;
                return conn.sendMessage(m.chat, { text: caption }, { quoted: m });
            }
        }

        if (result && typeof result === "object" && result.success) {
            const caption = `File uploaded successfully

Server : ${result.provider}
File Size : ${sizeDisplay}
Attempts : ${result.attempts.length}

URL:
${result.url}`;
            return conn.sendMessage(m.chat, { text: caption }, { quoted: m });
        }

        if (result && typeof result === "string") {
            const caption = `File uploaded successfully
Server : ${server.name}
File Size : ${sizeDisplay}
URL: ${result}`;
            return conn.sendMessage(m.chat, { text: caption }, { quoted: m });
        }

        return m.reply(
            `Upload failed on all servers.\nFile size: ${sizeDisplay}\nPlease try again later or use a different file.`
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["upload"];
handler.tags = ["tools"];
handler.command = /^(tourl|url|upload)$/i;

export default handler;