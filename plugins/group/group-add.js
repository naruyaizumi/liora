let handler = async (m, { conn, args, participants, usedPrefix, command }) => {
    try {
        let target = m.mentionedJid?.[0] || m.quoted?.sender || null;

        if (!target && args[0] && /^\d{5,}$/.test(args[0])) {
            const num = args[0].replace(/[^0-9]/g, "");
            target = await conn.lidMappingStore.getLIDForPN(num + "@s.whatsapp.net");
        }

        if (!target && args[0]) {
            const raw = args[0].replace(/[^0-9]/g, "");
            const lid = raw + "@lid";
            if (participants.some((p) => p.lid === lid)) {
                target = lid;
            }
        }

        if (!target)
            throw `Specify one valid member to add.\n› Example: ${usedPrefix + command} @628xxxx`;

        const result = await conn.groupParticipantsUpdate(m.chat, [target], "add");
        const userResult = result[0];

        if (userResult.status === "200") {
            return await conn.sendMessage(
                m.chat,
                {
                    text: `Successfully added @${target.split("@")[0]}.`,
                    mentions: [target],
                },
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

                return await conn.sendMessage(
                    m.chat,
                    {
                        text: `Unable to add user directly. Invitation has been sent, please wait.`,
                        mentions: [target],
                    },
                    { quoted: m }
                );
            }
        }

        throw `Failed to add the specified member.`;
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["add"];
handler.tags = ["group"];
handler.command = /^(add)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;