import { getAggregateVotesInPollMessage } from "baileys";

let handler = async (m, { conn }) => {
    const quotedMessage = m.quoted?.vM;
    if (!quotedMessage) return m.reply("Please reply to the poll message to view results.");

    const pollMessage =
        quotedMessage?.message?.pollCreationMessage ||
        quotedMessage?.message?.pollCreationMessageV3;

    if (!pollMessage) return m.reply("The replied message is not a valid poll.");

    try {
        const pollId = quotedMessage?.key?.id;
        const chatId = m.chat;
        if (!pollId || !chatId) return m.reply("Unable to determine the poll ID.");

        const chatStore = conn.chats[chatId];
        const messages = Object.values(chatStore?.messages || {});

        const pollUpdates = [];
        for (const msg of messages) {
            const update =
                msg?.message?.pollUpdateMessage ||
                msg?.message?.pollUpdateMessageV3 ||
                msg?.message?.pollUpdates ||
                null;

            if (!update) continue;

            const keyId =
                update?.pollCreationMessageKey?.id ||
                update?.pollCreationMessage?.key?.id ||
                update?.pollCreationMessageKeyId;

            if (keyId === pollId) pollUpdates.push(update);
        }

        const cachedAggregate = chatStore?.messages?.[pollId]?.pollAggregate || null;
        const aggregate =
            cachedAggregate ||
            getAggregateVotesInPollMessage({
                message: quotedMessage,
                pollUpdates,
            });

        let totalVotes = 0;
        for (const voters of Object.values(aggregate)) {
            totalVotes += Array.isArray(voters) ? voters.length : 0;
        }

        let resultText = `Poll Results: ${pollMessage.name || "Untitled"}\n\n`;
        for (const [option, voters] of Object.entries(aggregate)) {
            const count = Array.isArray(voters) ? voters.length : 0;
            const percent = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : 0;
            resultText += `• ${option}: ${count} vote${count !== 1 ? "s" : ""} (${percent}%)\n`;
        }

        resultText += `\nTotal votes: ${totalVotes}`;

        await m.reply(resultText.trim());
    } catch (e) {
        conn.logger.error(e);
        await m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["pollresult"];
handler.tags = ["group"];
handler.command = /^(pollresult|pollres)$/i;
handler.group = true;
handler.admin = true;
handler.botAdmin = false;

export default handler;