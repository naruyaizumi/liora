import { parsePhoneNumber } from "awesome-phonenumber";

let handler = async (m, { conn }) => {
    let regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    let data = await conn.groupMetadata(m.chat);
    let participants = data.participants;
    let countryMembers = {};
    for (let participant of participants) {
        let phoneNumber = "+" + participant.id.split("@")[0];
        let pn = parsePhoneNumber(phoneNumber);
        if (!pn.valid) continue;
        let regionCode = pn.regionCode;
        let country = regionNames.of(regionCode) || "Unknown";
        if (!countryMembers[country]) countryMembers[country] = [];
        countryMembers[country].push(participant.id);
    }
    let countryCounts = Object.keys(countryMembers).map((country) => ({
        name: country,
        total: countryMembers[country].length,
        jid: countryMembers[country],
    }));
    let totalSum = countryCounts.reduce((acc, c) => acc + c.total, 0);
    let totalRegion = Object.keys(countryMembers).length;
    let hasil = countryCounts.map(({ name, total, jid }) => ({
        name,
        total,
        jid,
        percentage: ((total / totalSum) * 100).toFixed(2) + "%",
    }));
    let cap = `*┌─⭓「 TOTAL MEMBER 」*
*│ • Name : ${data.subject}*
*│ • Total : ${participants.length}*
*│ • Total Region : ${totalRegion}*
*└───────────────⭓*

*┌─⭓「 REGION MEMBER 」*
${hasil
    .sort((b, a) => a.total - b.total)
    .map(
        (a) => `*│ • Region : ${a.name} [ ${a.percentage} ]*
*│ • Total : ${a.total}*${
            a.jid[0].startsWith("62")
                ? ""
                : `\n*│ • Jid :*\n${a.jid.map((i) => "*│* @" + i.split("@")[0]).join("\n")}`
        }`
    )
    .join("\n*├───────────────⭓*\n")}
*└───────────────⭓*`;
    await conn.sendMessage(
        m.chat,
        {
            text: cap,
            mentions: conn.parseMention(cap),
        },
        { quoted: m }
    );
};

handler.help = ["cekreg"];
handler.tags = ["tools"];
handler.command = /^(cekreg)$/i;
handler.group = true;
handler.owner = true;

export default handler;
