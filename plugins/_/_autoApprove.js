import { parsePhoneNumber } from 'awesome-phonenumber'

export async function before(m, { conn, isAdmin, isBotAdmin }) {
    if (!m.isGroup) return true;
    let chat = global.db.data.chats[m.chat];
    if (!chat) return true;
    if (!chat?.autoApprove || !isBotAdmin) return true;

    try {
        const jid = m.chat;
        const requests = await conn.groupRequestParticipantsList(jid);
        if (!requests || requests.length === 0) return true;

        const rejectList = [];
        const approveList = [];

        for (const r of requests) {
            const participantId = r.jid || r.phone_number;
            if (!participantId) continue;
            const number = r.phone_number?.split("@")[0] || "";
            const pn = parsePhoneNumber(number);
            let region = pn.isValid() ? pn.getRegionCode() : null;
            const continentFilterDisabled = 
                !global.config.continent || 
                global.config.continent.length === 0 || 
                global.config.continent === "-";
            if (continentFilterDisabled) {
                approveList.push(participantId);
            } else if (region && global.config.continent.includes(region)) {
                approveList.push(participantId);
            } else {
                rejectList.push(participantId);
            }
        }
        await delay(3000);
        if (rejectList.length > 0) {
            await conn.groupRequestParticipantsUpdate(jid, rejectList, "reject");
        }
        if (approveList.length > 0) {
            await conn.groupRequestParticipantsUpdate(jid, approveList, "approve");
        }
    } catch (e) {
        conn.logger.error('Error in auto-approve:', e);
    }

    return true;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}