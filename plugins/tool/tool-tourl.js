import {
    uploader1,
    uploader2,
    uploader3,
    uploader4,
    uploader5,
    uploader6,
    uploader7,
    uploader,
} from "../../lib/uploader.js";

const uploaders = {
    1: { name: "Catbox.moe", fn: uploader1, info: "Permanent hosting" },
    2: { name: "Uguu.se", fn: uploader2, info: "48 hours retention" },
    3: { name: "Qu.ax", fn: uploader3, info: "Temporary hosting" },
    4: { name: "Put.icu", fn: uploader4, info: "Direct upload" },
    5: { name: "Tmpfiles.org", fn: uploader5, info: "1 hour retention" },
    6: { name: "GoFile", fn: uploader6, info: "Image only uploader" },
    7: { name: "Videy", fn: uploader7, info: "Video only uploader" },
};

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        let q = m.quoted && (m.quoted.mimetype || m.quoted.mediaType) ? m.quoted : m;
        let mime = (q.msg || q).mimetype || q.mediaType || "";

        if (!args[0]) {
            if (!mime) {
                let listText = "*Upload Server Options*\n\n";
                listText += "*Auto Upload (1-5):*\n";
                for (let i = 1; i <= 5; i++) {
                    const { name, info } = uploaders[i];
                    listText += `${i}. ${name} — ${info}\n`;
                }
                listText += "\n*Manual Only:*\n";
                for (let i = 6; i <= 7; i++) {
                    const { name, info } = uploaders[i];
                    listText += `${i}. ${name} — ${info}\n`;
                }
                listText += `\nSelect upload server by number.\n› Example: ${usedPrefix + command} 1\n› Auto upload: send media without number`;
                return m.reply(listText);
            } else {
                await global.loading(m, conn);
                const buffer = await q.download?.();
                if (!Buffer.isBuffer(buffer) || !buffer.length)
                    return m.reply("Failed to get media buffer.");

                const sizeKB = (buffer.length / 1024).toFixed(2);
                const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
                const sizeDisplay = buffer.length > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

                let result = await uploader(buffer);
                if (result && result.success) {
                    return conn.sendButton(
                        m.chat,
                        {
                            text: `Uploaded\nServer: ${result.provider}\nSize: ${sizeDisplay}`,
                            buttons: [
                                {
                                    name: "cta_copy",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "Copy URL",
                                        copy_code: result.url,
                                    }),
                                },
                            ],
                            hasMediaAttachment: false,
                        },
                        { quoted: m }
                    );
                }
                return m.reply(`Upload failed.\nFile: ${sizeDisplay}`);
            }
        }

        args[0] = args[0].toString().trim().match(/\d+/)?.[0] || "";
        if (isNaN(args[0]) || !uploaders[args[0]]) {
            return m.reply("Invalid server. Use number only (1-7).");
        }

        await global.loading(m, conn);

        const buffer = await q.download?.();
        if (!Buffer.isBuffer(buffer) || !buffer.length)
            return m.reply("Failed to get media buffer.");

        const sizeKB = (buffer.length / 1024).toFixed(2);
        const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
        const sizeDisplay = buffer.length > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

        const server = uploaders[args[0]];
        let result = await server.fn(buffer);

        let caption = "";
        let url = "";

        if (!result) {
            await m.reply(`${server.name} failed. Trying fallback...`);
            result = await uploader(buffer);
            if (result && result.success) {
                caption = `Uploaded\nPrimary: ${server.name} (failed)\nFallback: ${result.provider}\nSize: ${sizeDisplay}`;
                url = result.url;
            }
        } else if (result && result.success) {
            caption = `Uploaded\nServer: ${result.provider}\nSize: ${sizeDisplay}\nTries: ${result.attempts.length}`;
            url = result.url;
        } else if (typeof result === "string") {
            caption = `Uploaded\nServer: ${server.name}\nSize: ${sizeDisplay}`;
            url = result;
        } else {
            return m.reply(`Upload failed.\nFile: ${sizeDisplay}`);
        }

        return conn.sendButton(
            m.chat,
            {
                text: caption,
                buttons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Copy URL",
                            copy_code: url,
                        }),
                    },
                ],
                hasMediaAttachment: false,
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply("Error: " + e.message);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["upload"];
handler.tags = ["tools"];
handler.command = /^(tourl|url|upload)$/i;

export default handler;
