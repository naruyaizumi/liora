let handler = async (m, { conn, text }) => {
    try {
        await global.loading(m, conn);

        const target =
            m.mentionedJid?.[0] ||
            m.quoted?.sender ||
            (text && /^\d+$/.test(text) ? text + "@s.whatsapp.net" : null);

        if (!target) return m.reply("Enter a number, mention, or reply to a user.");

        const pnJid = target.endsWith("@s.whatsapp.net")
            ? target
            : (await conn.lidMappingStore.getPNForLID(target)) || target;

        const [cek] = await conn.onWhatsApp(pnJid);
        if (!cek?.exists) return m.reply("This number is not registered on WhatsApp.");

        const userJid = cek.jid;
        const lid = (await conn.lidMappingStore.getLIDForPN(userJid)) || cek.lid;

        const pp =
            (await conn.profilePictureUrl(userJid, "image").catch(() => null)) ||
            "https://qu.ax/jVZhH.jpg";

        const statusRes = await conn.fetchStatus(userJid).catch(() => null);
        const about = statusRes?.[0]?.status?.status || "-";
        const lastUpdate = statusRes?.[0]?.status?.setAt
            ? formatDate(new Date(statusRes[0].status.setAt))
            : "-";
        const bisnis = await conn.getBusinessProfile(userJid).catch(() => null);

        const businessHours = bisnis?.business_hours?.business_config?.length
            ? bisnis.business_hours.business_config
                  .map((cfg) => {
                      const day = dayId(cfg.day_of_week);
                      const open = minuteToTime(cfg.open_time);
                      const close = minuteToTime(cfg.close_time);
                      return `• ${day}: ${open} - ${close}`;
                  })
                  .join("\n")
            : "-";

        const title =
            bisnis?.description || bisnis?.category ? "WhatsApp Business" : "WhatsApp User";

        const timestamp = new Date().toTimeString().split(" ")[0];

        const caption = `\`\`\`
┌─[${timestamp}]────────────
│  ${title}
└──────────────────────
User : @${userJid.split("@")[0]}
LID : ${lid || "-"}
Status : ${about}
Updated : ${lastUpdate}
${
    title === "WhatsApp Business"
        ? `Business : ${bisnis?.description || "-"}
Category : ${Array.isArray(bisnis?.category) ? bisnis.category.join(", ") : bisnis?.category || "-"}
Email : ${bisnis?.email || "-"}
Website : ${bisnis?.website?.join(", ") || "-"}
Address : ${bisnis?.address || "-"}
Work Hours : 
${businessHours}\n`
        : ""
}
───────────────────────
Profile info fetched successfully.
\`\`\``;

        await conn.sendMessage(
            m.chat,
            {
                image: { url: pp },
                caption,
                mentions: [userJid],
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply("Failed to fetch profile info. Possibly hidden or invalid.");
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
        new Intl.DateTimeFormat("en-US", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Jakarta",
        }).format(date) + " WIB"
    );
}

function dayId(day) {
    const map = {
        sun: "Sunday",
        mon: "Monday",
        tue: "Tuesday",
        wed: "Wednesday",
        thu: "Thursday",
        fri: "Friday",
        sat: "Saturday",
    };
    return map[day] || day;
}

function minuteToTime(minute) {
    if (!minute && minute !== 0) return "-";
    const h = Math.floor(minute / 60);
    const m = minute % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} WIB`;
}
