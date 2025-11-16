import pkg from 'baileys_helper';
const { sendInteractiveMessage } = pkg;

let handler = async (m, { conn, groupMetadata }) => {
    try {
        const invite = await conn.groupInviteCode(m.chat);
        const link = `https://chat.whatsapp.com/${invite}`;
        const info = `
Group Name: ${groupMetadata.subject}
Group ID: ${m.chat}`;

        await sendInteractiveMessage(conn, m.chat, {
            text: info,
            footer: 'Use the button below to copy the group link',
            interactiveButtons: [
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Copy Group Link',
                        copy_code: link
                    })
                }
            ]
        });

    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["grouplink"];
handler.tags = ["group"];
handler.command = /^(grouplink|link)$/i;
handler.group = true;
handler.botAdmin = true;

export default handler;