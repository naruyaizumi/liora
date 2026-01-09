let handler = async (m, { conn, groupMetadata }) => {
    const invite = await conn.groupInviteCode(m.chat);
    const link = `https://chat.whatsapp.com/${invite}`;
    const txt = `Group: ${groupMetadata.subject}\nID: ${m.chat}`;

    await conn.sendButton(m.chat, {
        text: txt,
        title: "Group Link",
        footer: "Click button to copy",
        interactiveButtons: [
            {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                    display_text: "Copy",
                    copy_code: link,
                }),
            },
        ],
        hasMediaAttachment: false,
    });
};

handler.help = ["grouplink"];
handler.tags = ["group"];
handler.command = /^(grouplink|link)$/i;
handler.group = true;
handler.botAdmin = true;

export default handler;
