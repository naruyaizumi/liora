import { parsePhoneNumber } from "awesome-phonenumber";

export async function before(m, { conn, isBotAdmin }) {
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
            const participantId = r.jid;
            if (!participantId) continue;
            const numberMatch = participantId.match(/^(\d+)@/);
            if (!numberMatch) {
                conn.logger.warn(`Could not extract number from JID: ${participantId}`);
                approveList.push(participantId);
                continue;
            }
            const number = numberMatch[1];
            const pn = parsePhoneNumber(`+${number}`);
            const isValid = pn?.valid === true;
            const region = isValid ? pn.regionCode : null;
            const continentFilterDisabled =
                !Array.isArray(global.config.continent) ||
                global.config.continent.length === 0 ||
                global.config.continent === "-";

            if (continentFilterDisabled) {
                approveList.push(participantId);
            } else if (region && global.config.continent.includes(region)) {
                approveList.push(participantId);
            } else {
                rejectList.push(participantId);
                conn.logger.info(`Rejecting ${participantId} - Region: ${region || "unknown"}`);
            }
        }

        if (rejectList.length > 0 || approveList.length > 0) {
            await delay(2000);
        }
        if (rejectList.length > 0) {
            try {
                await conn.groupRequestParticipantsUpdate(jid, rejectList, "reject");
            } catch (e) {
                conn.logger.error(e);
            }
        }
        if (rejectList.length > 0 && approveList.length > 0) {
            await delay(1000);
        }
        if (approveList.length > 0) {
            try {
                await conn.groupRequestParticipantsUpdate(jid, approveList, "approve");
            } catch (e) {
                conn.logger.error(e);
            }
        }
    } catch (e) {
        conn.logger.error(e);
    }

    return true;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
