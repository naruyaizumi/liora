export async function before(m, { conn, isBotAdmin }) {
    let chat = global.db.data.chats[m.chat];
    if (!chat) return true;
    if (!chat.autoApprove || !isBotAdmin) return true;
    try {
        let jid = m.chat;
        let requests = await conn.groupRequestParticipantsList(jid);
        if (!requests || requests.length === 0) return true;
        let participants = requests.map((u) => u.jid);
        let abusePattern = /^(212|994|90)/;
        let rejectList = participants.filter((j) => abusePattern.test(j.split("@")[0]));
        let approveList = participants.filter((j) => !abusePattern.test(j.split("@")[0]));
        if (rejectList.length) await conn.groupRequestParticipantsUpdate(jid, rejectList, "reject");
        if (approveList.length)
            await conn.groupRequestParticipantsUpdate(jid, approveList, "approve");
    } catch {
        // ignore
    }
    return true;
}
