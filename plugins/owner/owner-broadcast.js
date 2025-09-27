import { doBroadcast } from "../../lib/broadcast.js";

const handler = async (m, { conn, text, usedPrefix, command }) => {
    const cc = m.quoted ? await m.getQuotedObj() : m;
    if (!cc) {
        return m.reply("🩷 *Tidak ada pesan yang bisa dikirim, sayang~*");
    }

    const teks = text
        ? text.replace(new RegExp(`^(${usedPrefix}${command})\\s*`, "i"), "")
        : cc.text || cc.caption || "";

    const allGroups = Object.keys(conn.chats).filter((jid) => jid.endsWith("@g.us"));
    const totalGroups = allGroups.length;
    const groups = [];
    let muted = 0;

    for (const jid of allGroups) {
        const chatDb = global.db.data.chats[jid] || {};
        if (chatDb.mute) {
            muted++;
        } else {
            groups.push(jid);
        }
    }

    if (!groups.length) {
        return m.reply("🍱 *Semua grup dalam mute, tidak ada yang bisa dikirimi broadcast.*");
    }

    await m.reply(
        `🍘 *Total grup terdeteksi: ${totalGroups}*
🔇 *Grup di-mute: ${muted}*
🍜 *Grup aktif yang akan dikirimi: ${groups.length}*`
    );

    const name = global.config.author || "Liora Bot";
    const imageUrl = "https://files.catbox.moe/l0c3c2.jpg";
    const res = await fetch(imageUrl);
    const jpegThumbnail = Buffer.from(await res.arrayBuffer());

    const qtoko = {
        key: {
            fromMe: false,
            participant: "0@s.whatsapp.net",
            remoteJid: "status@broadcast",
        },
        message: {
            productMessage: {
                product: {
                    productImage: { mimetype: "image/jpeg", jpegThumbnail },
                    title: name,
                    description: null,
                    currencyCode: "USD",
                    priceAmount1000: "1",
                    retailerId: `© ${name}`,
                    productImageCount: 1,
                },
                businessOwnerJid: "0@s.whatsapp.net",
            },
        },
    };
    const { success, failed } = await doBroadcast(conn, cc, teks, groups, qtoko, jpegThumbnail, {
        ht: false,
    });

    await m.reply(
        `🍱 *Broadcast Selesai!*
🍜 *Berhasil: ${success}*
🍡 *Gagal: ${failed}*
🍘 *Total Grup Aktif: ${groups.length}*
🔇 *Total Grup di-mute: ${muted}*`
    );
};

handler.help = ["broadcast"];
handler.tags = ["owner"];
handler.command = /^(broadcast|bc)$/i;
handler.owner = true;

export default handler;
