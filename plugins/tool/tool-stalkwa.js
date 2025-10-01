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
        let lid = cek.lid;
        let pp = await conn
            .profilePictureUrl(userJid, "image")
            .catch(() => "https://qu.ax/jVZhH.jpg");
        let statusRes = await conn.fetchStatus(userJid).catch(() => null);
        let about = statusRes?.[0]?.status?.status || "Tidak tersedia";
        let lastUpdate = statusRes?.[0]?.status?.setAt
            ? formatDate(new Date(statusRes[0].status.setAt))
            : null;
        let bisnis = await conn.getBusinessProfile(userJid).catch(() => null);
        let userNumber = userJid.split("@")[0];
        let pn = parsePhoneNumber("+" + userNumber);
        let country = pn.valid ? pn.regionCode : "Tidak diketahui";
        let businessHours = "";
        if (bisnis?.business_hours?.business_config?.length) {
            businessHours =
                "\n🍵 *Jam Operasional:*\n" +
                bisnis.business_hours.business_config
                    .map((cfg) => {
                        let day = dayId(cfg.day_of_week);
                        let open = minuteToTime(cfg.open_time);
                        let close = minuteToTime(cfg.close_time);
                        return `*•> ${day}: ${open} - ${close}*`;
                    })
                    .join("\n");
        }
        let title =
            bisnis?.description || bisnis?.category ? "🍰 WhatsApp Business" : "🍩 WhatsApp";
        let caption = `*${title}*
────────────────────
🍡 *User:* @${userNumber}
🍩 *JID: ${userJid}*
🍙 *LID: ${lid}*

🍰 *Status: ${about}*
${about !== "Tidak tersedia" && lastUpdate ? `🕒 *Terakhir diubah: ${lastUpdate}*` : ""}
🍜 *Negara: ${country}*
${bisnis?.description ? `🍮 *Bisnis:* ${bisnis.description}` : ""}
${
    bisnis?.category
        ? `🍧 *Kategori: ${Array.isArray(bisnis.category) ? bisnis.category.join(", ") : bisnis.category}*`
        : ""
}
${bisnis?.email ? `🍬 *Email: ${bisnis.email}*` : ""}
${bisnis?.website?.length ? `🍭 *Website: ${bisnis.website.join(", ")}*` : ""}
${bisnis?.address ? `🍪 *Alamat: ${bisnis.address}*` : ""}
${businessHours}`.trim();

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

function formatDate(date) {
    return (
        new Intl.DateTimeFormat("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Jakarta",
        })
            .format(date)
            .replace(".", ":") + " WIB"
    );
}

function dayId(day) {
    const map = {
        sun: "Minggu",
        mon: "Senin",
        tue: "Selasa",
        wed: "Rabu",
        thu: "Kamis",
        fri: "Jumat",
        sat: "Sabtu",
    };
    return map[day] || day;
}

function minuteToTime(minute) {
    if (!minute && minute !== 0) return "-";
    let h = Math.floor(minute / 60);
    let m = minute % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} WIB`;
}
