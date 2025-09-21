import { addExif, sticker } from "../../lib/sticker.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        let stiker = false;
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || q.mediaType || "";
        if (!mime)
            return m.reply(
                `🍚 *Reply gambar, gif, atau video dengan perintah ${usedPrefix + command}*`
            );
        await global.loading(m, conn);
        if (/webp/g.test(mime)) {
            let img = await q.download?.();
            stiker = await addExif(
                img,
                global.config.stickpack || "",
                global.config.stickauth || ""
            );
            await conn.sendFile(m.chat, stiker, "sticker.webp", "", m);
        } else if (/image/g.test(mime)) {
            let img = await q.download?.();
            stiker = await sticker(img, false, global.config.stickpack, global.config.stickauth);
            await conn.sendFile(m.chat, stiker, "sticker.webp", "", m);
        } else if (/video/g.test(mime)) {
            if ((q.msg || q).seconds > 30)
                return m.reply("🍧 *Maksimal durasi video adalah 30 detik!*");
            let img = await q.download?.();
            stiker = await mp4ToWebp(img, {
                pack: global.config.stickpack,
                author: global.config.stickauth,
                crop: false,
            });
            await conn.sendFile(m.chat, stiker, "sticker.webp", "", m);
        } else if (args[0] && isUrl(args[0])) {
            stiker = await sticker(
                false,
                args[0],
                global.config.stickpack,
                global.config.stickauth,
                20
            );
            await conn.sendFile(m.chat, stiker, "sticker.webp", "", m);
        }
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["sticker"];
handler.tags = ["maker"];
handler.command = /^s(tic?ker)?(gif)?$/i;

export default handler;

const isUrl = (text) =>
    text.match(
        new RegExp(
            /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(jpe?g|gif|png)/,
            "gi"
        )
    );

async function mp4ToWebp(file, stickerMetadata) {
    let getBase64 = file.toString("base64");
    const Format = {
        file: `data:video/mp4;base64,${getBase64}`,
        processOptions: {
            crop: stickerMetadata?.crop,
            startTime: "00:00:00.0",
            endTime: "00:00:30.0",
            loop: 0,
        },
        stickerMetadata: {
            ...stickerMetadata,
        },
        sessionInfo: {
            WA_VERSION: "2.2106.5",
            PAGE_UA:
                "WhatsApp/2.2037.6 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36",
            WA_AUTOMATE_VERSION: "3.6.10 UPDATE AVAILABLE: 3.6.11",
            BROWSER_VERSION: "HeadlessChrome/88.0.4324.190",
            OS: "Windows Server 2016",
            START_TS: 1614310326309,
            NUM: "6247",
            LAUNCH_TIME_MS: 7934,
            PHONE_VERSION: "2.20.205.16",
        },
        config: {
            sessionId: "session",
            headless: true,
            qrTimeout: 20,
            authTimeout: 0,
            cacheEnabled: false,
            useChrome: true,
            killProcessOnBrowserClose: true,
            throwErrorOnTosBlock: false,
            chromiumArgs: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--aggressive-cache-discard",
                "--disable-cache",
                "--disable-application-cache",
                "--disable-offline-load-stale-cache",
                "--disk-cache-size=0",
            ],
            executablePath:
                "C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
            skipBrokenMethodsCheck: true,
            stickerServerEndpoint: true,
        },
    };
    let res = await fetch("https://sticker-api.openwa.dev/convertMp4BufferToWebpDataUrl", {
        method: "post",
        headers: {
            Accept: "application/json, text/plain, /",
            "Content-Type": "application/json;charset=utf-8",
        },
        body: JSON.stringify(Format),
    });
    return Buffer.from((await res.text()).split(";base64,")[1], "base64");
}
