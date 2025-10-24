let handler = async (m, { conn, groupMetadata }) => {
    try {
        const invite = await conn.groupInviteCode(m.chat);
        const link = `https://chat.whatsapp.com/${invite}`;

        const info = `\`\`\`
Group Name : ${groupMetadata.subject}
Group ID   : ${m.chat}
───────────────────────────
Use the button below to copy the link.
\`\`\``;

        await conn.sendMessage(
            m.chat,
            {
                text: info,
                title: "Group Invite Link",
                footer: "© Naruya Izumi 2024",
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "Copy Group Link",
                            copy_code: link,
                        }),
                    },
                ],
            },
            { quoted: m }
        );
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
