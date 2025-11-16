import pkg from 'baileys_helper';
const { sendInteractiveMessage } = pkg;

let handler = async (m, { conn, text }) => {
    try {
        await global.loading(m, conn);

        const input =
            m.mentionedJid?.[0] ||
            m.quoted?.sender ||
            (text && /^\d+$/.test(text) ? text + "@s.whatsapp.net" : null);

        if (!input) return m.reply("Enter a number, mention, or reply to a user.");

        let lid;

        if (/@lid$/.test(input)) {
            lid = input.replace(/@lid$/, "");
        } else {
            const raw = await conn.signalRepository.lidMapping.getLIDForPN(input);
            if (!raw) return m.reply("Cannot resolve LID for this user.");
            lid = raw.replace(/@lid$/, "");
        }

        await sendInteractiveMessage(conn, m.chat, {
            text: `Target LID: ${lid}`,
            footer: 'Use the button below to copy the LID',
            interactiveButtons: [
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Copy LID',
                        copy_code: lid
                    })
                }
            ]
        });

    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["getlid"];
handler.tags = ["tools"];
handler.command = /^getlid$/i;

export default handler;