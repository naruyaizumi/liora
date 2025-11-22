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
    uploader10,
    uploader,
} from "../../lib/uploader.js";

if (!global.uploadSession) global.uploadSession = {};

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
    10: { name: "Nekohime", fn: uploader10, info: "Nekohime CDN Uploader" },
};

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        if (m.buttonId) args = m.buttonId.split(" ");

        let q = m.quoted && (m.quoted.mimetype || m.quoted.mediaType) ? m.quoted : m;
        let mime = (q.msg || q).mimetype || q.mediaType || "";

        if (!args[0]) {
            if (mime) {
                global.uploadSession[m.sender] = {
                    q,
                    time: Date.now(),
                };

                const rows = Object.entries(uploaders).map(([num, { name, info }]) => ({
                    header: `Server ${num}`,
                    title: name,
                    description: info,
                    id: `${usedPrefix + command} ${num}`,
                }));

                return conn.sendButton(
                    m.chat,
                    {
                        caption: "Select upload server below",
                        title: "Upload Server Options",
                        footer: "Choose one to continue",
                        buttons: [
                            {
                                name: "single_select",
                                buttonParamsJson: JSON.stringify({
                                    title: "Select Server",
                                    sections: [
                                        {
                                            title: "Upload Service List",
                                            rows: rows,
                                        },
                                    ],
                                }),
                            },
                        ],
                    }
                );
            }
        }

        if (args[0]) args[0] = args[0].toString().trim().match(/\d+/)?.[0] || "";

        if (!mime) {
            const sess = global.uploadSession[m.sender];
            if (!sess) return m.reply("Send or reply to a media file to upload.");

            q = sess.q;
            mime = (q.msg || q).mimetype || q.mediaType || "";
        }

        if (isNaN(args[0]) || !uploaders[args[0]]) {
            return m.reply("Invalid server. Use number only.");
        }

        await global.loading(m, conn);

        const buffer = await q.download?.();
        if (!Buffer.isBuffer(buffer) || !buffer.length)
            return m.reply("Failed to get media buffer.");

        const sizeKB = (buffer.length / 1024).toFixed(2);
        const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
        const sizeDisplay =
            buffer.length > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

        const serverNum = args[0];
        const server = uploaders[serverNum];

        let result = await server.fn(buffer);

        if (!result) {
            await conn.sendMessage(
                m.chat,
                { text: `${server.name} failed. Trying fallback...` },
                { quoted: m },
            );

            result = await uploader(buffer);

            if (result && result.success) {
                delete global.uploadSession[m.sender];
                return conn.sendButton(
                    m.chat,
                    {
                        text: `Uploaded\nPrimary: ${server.name} (failed)\nFallback: ${result.provider}\nSize: ${sizeDisplay}`,
                        buttons: [
                            {
                                name: "cta_copy",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "Copy URL",
                                    copy_code: result.url
                                }),
                            },
                        ],
                        hasMediaAttachment: false,
                    },
                    { quoted: m }
                );
            }
        }

        if (result && result.success) {
            delete global.uploadSession[m.sender];
            return conn.sendButton(
                m.chat,
                {
                    text: `Uploaded\nServer: ${result.provider}\nSize: ${sizeDisplay}\nTries: ${result.attempts.length}`,
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "Copy URL",
                                copy_code: result.url
                            }),
                        },
                    ],
                    hasMediaAttachment: false,
                },
                { quoted: m }
            );
        }

        if (typeof result === "string") {
            delete global.uploadSession[m.sender];
            return conn.sendButton(
                m.chat,
                {
                    text: `Uploaded\nServer: ${server.name}\nSize: ${sizeDisplay}`,
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "Copy URL",
                                copy_code: result
                            }),
                        },
                    ],
                    hasMediaAttachment: false,
                },
                { quoted: m }
            );
        }

        delete global.uploadSession[m.sender];
        m.reply(`Upload failed.\nFile: ${sizeDisplay}`);
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
