export async function doBroadcast(
    conn,
    cc,
    teks,
    groups,
    qtoko,
    jpegThumbnail,
    { ht = false } = {}
) {
    let success = 0;
    let failed = 0;
    for (let id of groups) {
        try {
            let type = cc.mtype || "";
            let content = cc.msg || {};
            let quoted = qtoko;
            let buffer = await cc.download?.();
            if (type === "imageMessage") {
                await conn.sendFile(id, buffer, "image.jpg", teks, quoted);
            } else if (type === "videoMessage") {
                await conn.sendFile(id, buffer, "video.mp4", teks, quoted);
            } else if (type === "documentMessage") {
                await conn.sendFile(
                    id,
                    buffer,
                    content.fileName || "document",
                    teks,
                    quoted,
                    false,
                    { mimetype: content.mimetype || "application/octet-stream" }
                );
            } else if (type === "audioMessage") {
                let isPTT = content.ptt === true;
                let mime = content.mimetype || (isPTT ? "audio/ogg; codecs=opus" : "audio/mpeg");
                await conn.sendFile(
                    id,
                    buffer,
                    `audio.${isPTT ? "opus" : "mp3"}`,
                    "",
                    quoted,
                    isPTT,
                    { mimetype: mime }
                );
            } else if (type === "stickerMessage") {
                await conn.sendFile(id, buffer, "sticker.webp", "", quoted);
            } else if (type === "contactMessage") {
                let vcard = content.vcard;
                let nama = content.displayName || "Contact";
                let nomor = (vcard.match(/TEL;[^:]*:(\+?\d+)/) || [])[1] || "";
                await conn.sendContact(id, [[nomor.replace(/\D/g, ""), nama]], quoted);
            } else if (type === "locationMessage") {
                await conn.sendMessage(
                    id,
                    {
                        location: {
                            degreesLatitude: content.degreesLatitude,
                            degreesLongitude: content.degreesLongitude,
                            name: content.name || "",
                            address: content.address || "",
                            jpegThumbnail,
                        },
                    },
                    { quoted }
                );
            } else if (type === "liveLocationMessage") {
                await conn.sendMessage(
                    id,
                    {
                        location: {
                            degreesLatitude: content.degreesLatitude,
                            degreesLongitude: content.degreesLongitude,
                            name: content.name || "",
                            accuracyInMeters: content.accuracyInMeters || 0,
                            speedInMps: content.speedInMps || 0,
                            degreesClockwiseFromMagneticNorth:
                                content.degreesClockwiseFromMagneticNorth || 0,
                            caption: content.caption || teks,
                            live: true,
                        },
                    },
                    { quoted }
                );
            } else {
                let extra = {};
                if (ht) {
                    let meta = await conn.groupMetadata(id).catch(() => null);
                    if (meta) extra.mentions = meta.participants.map((p) => p.id);
                }
                await conn.sendMessage(id, { text: teks, ...extra }, { quoted });
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
    return new Promise((resolve) => setTimeout(resolve, 5500));
}
