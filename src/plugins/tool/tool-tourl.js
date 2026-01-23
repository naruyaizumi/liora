/**
 * @file File upload to various servers command handler
 * @module plugins/tools/upload
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Uploads files to various hosting servers and returns URLs
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {Array} args - Command arguments
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Command to upload media files to various hosting servers and return shareable URLs.
 * Supports multiple servers with automatic fallback and interactive copy buttons.
 *
 * @features
 * - Uploads to 7 different hosting servers
 * - Shows server list when no server specified
 * - Automatic fallback if primary server fails
 * - Displays file size information
 * - Interactive copy buttons for URLs
 * - Supports all media types (images, videos, documents)
 */

import {
    uploader1,
    uploader2,
    uploader3,
    uploader4,
    uploader5,
    uploader6,
    uploader7,
    uploader,
} from "#lib/uploader.js";

const servers = {
    1: { name: "Catbox.moe", fn: uploader1 },
    2: { name: "Uguu.se", fn: uploader2 },
    3: { name: "Qu.ax", fn: uploader3 },
    4: { name: "Put.icu", fn: uploader4 },
    5: { name: "Tmpfiles.org", fn: uploader5 },
    6: { name: "Videy", fn: uploader6 },
    7: { name: "GoFile", fn: uploader7 },
};

let handler = async (m, { sock, args, usedPrefix, command }) => {
    const q = m.quoted?.mimetype ? m.quoted : m;
    const mime = (q.msg || q).mimetype || q.mediaType || "";

    if (!args[0]) {
        if (!mime) {
            const list = `*Upload Server*\n
1. Catbox.moe
2. Uguu.se
3. Qu.ax
4. Put.icu
5. Tmpfiles.org
6. Videy (Video only)
7. GoFile (Image only)

Ex: ${usedPrefix + command} 1`;
            return m.reply(list);
        }

        await global.loading(m, sock);
        const buffer = await q.download?.();

        const sizeKB = (buffer.length / 1024).toFixed(2);
        const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
        const size = buffer.length > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

        const res = await uploader(buffer);
        if (res?.success) {
            return sock.client(
                m.chat,
                {
                    text: `Uploaded\nServer: ${res.provider}\nSize: ${size}`,
                    interactiveButtons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "Copy URL",
                                copy_code: res.url,
                            }),
                        },
                    ],
                },
                { quoted: m }
            );
        }
        return m.reply(`Upload failed.\nSize: ${size}`);
    }

    const num = args[0].toString().trim().match(/\d+/)?.[0];
    if (!num || !servers[num]) return m.reply("Invalid server (1-7)");

    await global.loading(m, sock);
    const buffer = await q.download?.();

    const sizeKB = (buffer.length / 1024).toFixed(2);
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
    const size = buffer.length > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

    const srv = servers[num];
    let result = await srv.fn(buffer);
    let caption = "";
    let url = "";

    if (!result) {
        await m.reply(`${srv.name} failed. Trying fallback...`);
        result = await uploader(buffer);
        if (result?.success) {
            caption = `Uploaded\nPrimary: ${srv.name} (failed)\nFallback: ${result.provider}\nSize: ${size}`;
            url = result.url;
        }
    } else if (result.success) {
        caption = `Uploaded\nServer: ${result.provider}\nSize: ${size}`;
        url = result.url;
    } else if (typeof result === "string") {
        caption = `Uploaded\nServer: ${srv.name}\nSize: ${size}`;
        url = result;
    } else {
        return m.reply(`Upload failed.\nSize: ${size}`);
    }

    return sock.client(
        m.chat,
        {
            text: caption,
            interactiveButtons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Copy URL",
                        copy_code: url,
                    }),
                },
            ],
        },
        { quoted: m }
    );
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["upload"];
handler.tags = ["tools"];
handler.command = /^(tourl|url|upload)$/i;

export default handler;
