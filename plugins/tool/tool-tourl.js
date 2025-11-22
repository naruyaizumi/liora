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

const uploaders = {
    1: { name: "Catbox.moe", fn: uploader1, info: "Permanent hosting" },
    2: { name: "Uguu.se", fn: uploader2, info: "48 hours retention" },
    3: { name: "Qu.ax", fn: uploader3, info: "Temporary hosting" },
    4: { name: "Put.icu", fn: uploader4, info: "Direct upload" },
    5: { name: "Tmpfiles.org", fn: uploader5, info: "1 hour retention" },
    6: { name: "Nauval.cloud", fn: uploader6, info: "30 minutes default" },
    7: { name: "Deline", fn: uploader7, info: "Deline uploader" },
    8: { name: "Zenitsu", fn: uploader8, info: "Zenitsu uploader" },
    9: {
        name: "CloudKuImages",
        fn: uploader9,
        info: "CloudKuImages uploader"
    },
    10: { name: "Nekohime", fn: uploader10, info: "Nekohime CDN Uploader" },
};

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        let q = m.quoted && (m.quoted.mimetype || m.quoted.mediaType) ?
            m.quoted : m;
        let mime = (q.msg || q).mimetype || q.mediaType || "";
        
        if (!args[0]) {
            if (!mime) {
                let listText = "*Upload Server Options*\n\n";
                for (const [num, { name, info }] of Object.entries(
                        uploaders)) {
                    listText += `${num}. ${name} — ${info}\n`;
                }
                listText +=
                    `\nSelect upload server by number.\n› Example: ${usedPrefix + command} 1`;
                return m.reply(listText);
            } else {
                await global.loading(m, conn);
                const buffer = await q.download?.();
                if (!Buffer.isBuffer(buffer) || !buffer.length)
                    return m.reply("Failed to get media buffer.");
                
                const sizeKB = (buffer.length / 1024).toFixed(2);
                const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
                const sizeDisplay =
                    buffer.length > 1024 * 1024 ? `${sizeMB} MB` :
                    `${sizeKB} KB`;
                
                let result = await uploader(buffer);
                if (result && result.success) {
                    return conn.sendButton(
                        m.chat,
                        {
                            text: `Uploaded\nServer: ${result.provider}\nSize: ${sizeDisplay}`,
                            buttons: [
                            {
                                name: "cta_copy",
                                buttonParamsJson: JSON
                                    .stringify({
                                        display_text: "Copy URL",
                                        copy_code: result
                                            .url,
                                    }),
                            }, ],
                            hasMediaAttachment: false,
                        }, { quoted: m }
                    );
                }
                return m.reply(`Upload failed.\nFile: ${sizeDisplay}`);
            }
        }
        
        args[0] = args[0].toString().trim().match(/\d+/)?.[0] || "";
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
            buffer.length > 1024 * 1024 ? `${sizeMB} MB` :
            `${sizeKB} KB`;
        
        const server = uploaders[args[0]];
        let result = await server.fn(buffer);
        
        let caption = "";
        let url = "";
        
        if (!result) {
            await m.reply(`${server.name} failed. Trying fallback...`);
            result = await uploader(buffer);
            if (result && result.success) {
                caption =
                    `Uploaded\nPrimary: ${server.name} (failed)\nFallback: ${result.provider}\nSize: ${sizeDisplay}`;
                url = result.url;
            }
        } else if (result && result.success) {
            caption =
                `Uploaded\nServer: ${result.provider}\nSize: ${sizeDisplay}\nTries: ${result.attempts.length}`;
            url = result.url;
        } else if (typeof result === "string") {
            caption =
                `Uploaded\nServer: ${server.name}\nSize: ${sizeDisplay}`;
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
                }, ],
                hasMediaAttachment: false,
            }, { quoted: m }
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