export async function doBroadcast(conn, cc, teks, groups, { ht = false } = {}) {
    let success = 0;
    let failed = 0;

    for (const id of groups) {
        try {
            const type = cc.mtype || "";
            const content = cc.msg || {};
            let buffer = null;

            if (cc.msg) {
                try {
                    buffer = await conn.downloadM(cc.msg, type.replace("Message", ""), false);
                } catch (err) {
                    console.error("[DOWNLOAD ERROR]:", err);
                    buffer = null;
                }
            }

            if (type === "imageMessage" && buffer) {
                await conn.sendFile(id, buffer, "image.jpg", teks || content.caption || "");
            } else if (type === "videoMessage" && buffer) {
                await conn.sendFile(id, buffer, "video.mp4", teks || content.caption || "");
            } else if (type === "audioMessage" && buffer) {
                const isPTT = content.ptt === true;
                const mime = content.mimetype || (isPTT ? "audio/ogg; codecs=opus" : "audio/mpeg");
                await conn.sendFile(id, buffer, `audio.${isPTT ? "opus" : "mp3"}`, "", isPTT, {
                    mimetype: mime,
                });
            } else {
                const extra = {};
                if (ht) {
                    const meta = await conn.groupMetadata(id).catch(() => null);
                    if (meta) {
                        extra.mentions = meta.participants.map((p) => p.id);
                    }
                }
                const finalText =
                    teks || content.text || content.caption || "📢 Broadcast tanpa teks";
                await conn.sendMessage(id, { text: finalText, ...extra });
            }

            success++;
            await delay();
        } catch (err) {
            console.error(`[ERROR BROADCAST ${id}]:`, err);
            failed++;
        }
    }

    return { success, failed };
}

function delay() {
    return new Promise((resolve) => setTimeout(resolve, 3000));
}
