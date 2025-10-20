import { fetch } from "liora-lib";

const oc = {
    upload: async (webpBuffer) => {
        const res = await fetch("https://host21.onlineconverter.com/file/send", {
            method: "POST",
            headers: {
                Referer: "https://www.onlineconverter.com/",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
            },
            formData: {
                file: {
                    value: webpBuffer,
                    filename: `${Date.now()}.webp`,
                    contentType: "image/webp",
                },
                class: "video",
                from: "webp",
                to: "mp4",
                source: "online",
            },
        });

        if (!res.ok)
            throw Error(
                `Upload failed: ${res.status} ${res.statusText}\n${(await res.text()) || null}`
            );
        return await res.text();
    },

    cekProgress: async (validUploadUrl) => {
        const id = validUploadUrl?.match(/https:\/\/www.onlineconverter.com\/convert\/(\w+)/)?.[1];
        if (!id) throw Error(`Invalid link format in cekProgress`);

        let status;
        do {
            const r = await fetch(`https://host21.onlineconverter.com/file/${id}`, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
                },
            });
            if (!r.ok)
                throw Error(
                    `Progress check failed: ${r.status} ${r.statusText}\n${(await r.text()) || null}`
                );
            status = await r.text();

            if (status === "i") throw Error(`Too many requests. Cooldown for 1 hour.`);
            if (status === "d") return `https://host21.onlineconverter.com/file/${id}/download`;

            await new Promise((re) => setTimeout(re, 5000));
        } while (["w", "s", "c"].includes(status));
    },

    run: async (webpBuffer) => {
        const url = await oc.upload(webpBuffer);
        const result = await oc.cekProgress(url);
        return result;
    },
};

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        const q = m.quoted ?? m;
        const mime = (q.mimetype || q.mediaType || "").toLowerCase();

        if (!/webp/.test(mime)) {
            return m.reply(`Reply a sticker with the command: ${usedPrefix + command}`);
        }

        await global.loading(m, conn);

        const buffer = await q.download?.();
        if (!buffer || !Buffer.isBuffer(buffer)) {
            throw new Error("Failed to download sticker buffer.");
        }

        const result = await oc.run(buffer);
        if (!result) throw new Error("No video result returned.");

        await conn.sendMessage(
            m.chat,
            {
                video: { url: result },
                caption: "Sticker successfully converted to video.",
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["tovideo"];
handler.tags = ["maker"];
handler.command = /^(tovideo)$/i;

export default handler;
