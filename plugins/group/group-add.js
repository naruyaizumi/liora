let handler = async (m, { conn, args, usedPrefix, command }) => {
    let num = args[0].replace(/\D/g, "");
    if (!num || num.length < 5)
        return m.reply(`Specify one valid number.\n› Example: ${usedPrefix + command} 628xxxx`);
    const target = num + "@s.whatsapp.net";
    try {
        const result = await conn.groupParticipantsUpdate(m.chat, [target], "add");
        const userResult = result[0];
        if (userResult.status === "200") {
            return conn.sendMessage(
                m.chat,
                { text: `Successfully added to the group.` },
                { quoted: m }
            );
        }

        if (userResult.status === "403") {
            const addReq = userResult.content?.content?.[0]?.attrs;
            const phoneNumber = userResult.content?.attrs?.phone_number || target;

            if (addReq?.code && addReq?.expiration) {
                const groupName = await conn.getName(m.chat);

                await conn.sendMessage(phoneNumber, {
                    groupInvite: {
                        jid: m.chat,
                        name: groupName,
                        caption: `I could not add you directly. Please join using this invite link.`,
                        code: addReq.code,
                        expiration: Number(addReq.expiration),
                    },
                });

                return conn.sendMessage(
                    m.chat,
                    { text: `Unable to add user directly. Invitation has been sent, please wait.` },
                    { quoted: m }
                );
            }
        }

        return m.reply("Failed to add the specified member.");
    } catch (err) {
        console.error(`Add failed for ${target}:`, err);
        return m.reply("Failed to add the specified member.");
    }
};

handler.help = ["add"];
handler.tags = ["group"];
handler.command = /^(add)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
