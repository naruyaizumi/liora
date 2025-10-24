export async function before(m, { conn }) {
    if (!m.isGroup) return true;
    const groupMetadata =
        (m.isGroup ? this.chats?.[m.chat]?.metadata || (await this.groupMetadata(m.chat)) : {}) ||
        {};
    const participants = m.isGroup ? groupMetadata.participants || [] : [];
    const botId = this.decodeJid(this.user.id);
    const bot =
        participants.find(
            (u) => this.decodeJid(u.lid) === botId || this.decodeJid(u.id) === botId
        ) || {};
    const isBotAdmin = bot?.admin === "admin" || bot?.admin === "superadmin";
    let chat = global.db.data.chats[m.chat];
    if (!chat) return true;
    if (!chat?.autoApprove || !isBotAdmin) return true;
    try {
        const jid = m.chat;
        const requests = await conn.groupRequestParticipantsList(jid);
        if (!requests || requests.length === 0) return true;

        const abusePattern = /^(212|994|90)/;

        const rejectList = requests
            .filter((r) => abusePattern.test(r.phone_number?.split("@")[0] || ""))
            .flatMap((r) => [r.phone_number, r.jid].filter(Boolean));
        const approveList = requests
            .filter((r) => !abusePattern.test(r.phone_number?.split("@")[0] || ""))
            .flatMap((r) => [r.phone_number, r.jid].filter(Boolean));
        await delay(2000);
        if (rejectList.length) {
            await conn.groupRequestParticipantsUpdate(jid, rejectList, "reject");
        }
        if (approveList.length) {
            await conn.groupRequestParticipantsUpdate(jid, approveList, "approve");
        }
    } catch (e) {
        conn.logger.error(e);
    }

    return true;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
