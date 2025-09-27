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

    for (const id of groups) {
        try {
            const type = cc.mtype || "";
            const content = cc.msg || {};
            const quoted = qtoko;

            // Download media pakai conn.downloadM
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
                await conn.sendFile(id, buffer, "image.jpg", teks || content.caption || "", quoted);
            } else if (type === "videoMessage" && buffer) {
                await conn.sendFile(id, buffer, "video.mp4", teks || content.caption || "", quoted);
            } else if (type === "documentMessage" && buffer) {
                await conn.sendFile(
                    id,
                    buffer,
                    content.fileName || "document",
                    teks || content.caption || "",
                    quoted,
                    false,
                    { mimetype: content.mimetype || "application/octet-stream" }
                );
            } else if (type === "audioMessage" && buffer) {
                const isPTT = content.ptt === true;
                const mime = content.mimetype || (isPTT ? "audio/ogg; codecs=opus" : "audio/mpeg");
                await conn.sendFile(
                    id,
                    buffer,
                    `audio.${isPTT ? "opus" : "mp3"}`,
                    "",
                    quoted,
                    isPTT,
                    { mimetype: mime }
                );
            } else if (type === "stickerMessage" && buffer) {
                await conn.sendFile(id, buffer, "sticker.webp", "", quoted);
            } else if (type === "contactMessage") {
                const vcard = content.vcard || "";
                const nama = content.displayName || "Contact";
                const nomor = (vcard.match(/TEL;[^:]*:(\+?\d+)/) || [])[1] || "";
                if (nomor) {
                    await conn.sendContact(id, [[nomor.replace(/\D/g, ""), nama]], quoted);
                } else {
                    await conn.sendMessage(id, { text: teks || "📢 Contact kosong" }, { quoted });
                }
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
                const extra = {};
                if (ht) {
                    const meta = await conn.groupMetadata(id).catch(() => null);
                    if (meta) {
                        extra.mentions = meta.participants.map((p) => p.id);
                    }
                }
                const finalText =
                    teks || content.text || content.caption || "📢 Broadcast tanpa teks";
                await conn.sendMessage(id, { text: finalText, ...extra }, { quoted });
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
