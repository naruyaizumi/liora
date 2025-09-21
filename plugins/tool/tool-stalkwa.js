import { parsePhoneNumber } from "awesome-phonenumber";

let handler = async (m, { conn, text }) => {
    try {
        await global.loading(m, conn);
        let userJid =
            m.mentionedJid?.[0] || (text && /^\d+$/.test(text) ? text + "@s.whatsapp.net" : null);
        if (!userJid) return m.reply("🍙 *Masukkan nomor atau mention user!*");
        const [cek] = await conn.onWhatsApp(userJid);
        if (!cek?.exists) return m.reply("🍩 *Nomor tidak terdaftar di WhatsApp!*");
        userJid = cek.jid;
        let pp = await conn
            .profilePictureUrl(userJid, "image")
            .catch(() => "https://cloudkuimages.guru/uploads/images/pg5XDGVr.jpg");
        let status = await conn.fetchStatus(userJid).catch(() => ({ status: "Tidak tersedia" }));
        let bisnis = await conn.getBusinessProfile(userJid).catch(() => null);
        let userNumber = userJid.split("@")[0];
        let pn = parsePhoneNumber("+" + userNumber);
        let country = pn.valid ? pn.regionCode : "Tidak diketahui";
        let presenceStatus = "🍢 *Tidak bisa dideteksi*";
        try {
            await conn.presenceSubscribe(userJid);
            await new Promise((r) => setTimeout(r, 1500));
            let presence = conn.presence?.[userJid]?.lastKnownPresence || "";
            presenceStatus =
                presence === "available"
                    ? "🍡 Online"
                    : presence === "composing"
                      ? "🍜 Sedang Mengetik..."
                      : presence === "recording"
                        ? "🍱 Sedang Merekam..."
                        : presence === "paused"
                          ? "🍙 Mengetik Berhenti..."
                          : "🍢 Offline";
        } catch {
            // ignore
        }
        let title =
            bisnis?.description || bisnis?.category ? "🍰 WhatsApp Business" : "🍩 WhatsApp";
        let caption = `*${title}*
────────────────────
🍡 *User:* @${userNumber}
🍩 *JID: ${userJid}*

🍰 *Status: ${status.status || "Tidak tersedia"}*
🍱 *Kehadiran: ${presenceStatus}*
🍜 *Negara: ${country}*
${bisnis?.description ? `🍮 *Bisnis: ${bisnis.description}*` : ""}
${bisnis?.category ? `🍧 *Kategori: ${bisnis.category}*` : ""}`.trim();
        await conn.sendFile(m.chat, pp, "profile.jpg", caption, m, null, { mentions: [userJid] });
    } catch (e) {
        console.error(e);
        m.reply("🍩 *Gagal mengambil data profil, mungkin nomornya salah atau disembunyikan~*");
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["stalkwa"];
handler.tags = ["tools"];
handler.command = /^(stalkwa|getwa|cekwa)$/i;

export default handler;
