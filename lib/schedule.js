/* global conn */
import { fetch } from "liora-lib";

async function checkGempa() {
    try {
        const chat = global.db.data.chats;
        const res = await fetch("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json");
        if (!res.ok) throw new Error("Failed to fetch data from BMKG");

        const json = await res.json();
        const gempa = json?.Infogempa?.gempa;
        if (!gempa || !gempa.DateTime) return;

        if (gempa.DateTime !== chat.gempaDateTime) {
            chat.gempaDateTime = gempa.DateTime;

            const groups = Object.entries(conn.chats)
                .filter(
                    ([jid, chat]) =>
                        jid.endsWith("@g.us") &&
                        chat.isChats &&
                        !chat.metadata?.read_only &&
                        !chat.metadata?.announce &&
                        !chat.isCommunity &&
                        !chat.isCommunityAnnounce &&
                        !chat?.metadata?.isCommunity &&
                        !chat?.metadata?.isCommunityAnnounce
                )
                .map(([jid]) => jid);

            for (const number of groups) {
                if (chat[number]?.notifgempa && gempa.DateTime !== chat[number].gempaDateTime) {
                    chat[number].gempaDateTime = gempa.DateTime;

                    const mmi = gempa.Dirasakan
                        ? `${gempa.Dirasakan} MMI Scale`
                        : "No data available";

                    const timestamp = new Date().toTimeString().split(" ")[0];

                    const caption = `
┌─[${timestamp}]────────────
│  EARTHQUAKE REPORT (BMKG)
└──────────────────────
Date : ${gempa.Tanggal}
Local Time : ${gempa.Jam} WIB
UTC Time : ${gempa.DateTime}
Location : ${gempa.Wilayah}
Coordinates : ${gempa.Coordinates}
Magnitude : ${gempa.Magnitude}
Depth : ${gempa.Kedalaman}
Potential : ${gempa.Potensi}
───────────────────────
Felt Intensity : ${mmi}
───────────────────────
Source : BMKG (Meteorology, Climatology and Geophysics Agency)`;

                    await conn.sendMessage(number, {
                        image: { url: `https://data.bmkg.go.id/DataMKG/TEWS/${gempa.Shakemap}` },
                        caption,
                    });
                }
            }
        }
    } catch {
        conn.logger.error(e);
    }
}

export { checkGempa };
