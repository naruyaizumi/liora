let handler = async (m, { conn, args, participants, usedPrefix, command }) => {
    let target = m.mentionedJid?.[0] || m.quoted?.sender || null

    if (!target && args[0]) {
        const raw = args[0].replace(/[^0-9]/g, "")
        if (raw.length >= 5) {
            const jid = raw + "@s.whatsapp.net"
            const lid = raw + "@lid"

            try {
                target = (await conn.lidMappingStore.getLIDForPN(jid)) || jid
            } catch {
                target = jid
            }

            if (participants.some(p => p.lid === lid)) {
                target = lid
            } else if (participants.some(p => p.id === jid)) {
                target = jid
            }

            if (!target.endsWith("@s.whatsapp.net") && !target.endsWith("@lid")) {
                target = jid
            }
        }
    }

    if (!target) {
        return m.reply(`Specify one valid member to add.\n› Example: ${usedPrefix + command} @628xxxx`)
    }

    try {
        const result = await conn.groupParticipantsUpdate(m.chat, [target], "add")
        const userResult = result?.[0]

        if (userResult?.status === "200") {
            return await conn.sendMessage(
                m.chat,
                {
                    text: `Successfully added @${target.split("@")[0]}.`,
                    mentions: [target],
                },
                { quoted: m }
            )
        }

        if (userResult?.status === "403") {
            const addReq = userResult.content?.content?.[0]?.attrs
            const phoneNumber = userResult.content?.attrs?.phone_number || target
            const groupName = await conn.getName(m.chat)

            if (addReq?.code && addReq?.expiration) {
                await conn.sendMessage(phoneNumber, {
                    groupInvite: {
                        jid: m.chat,
                        name: groupName,
                        caption: `I could not add you directly. Please join using this invite link.`,
                        code: addReq.code,
                        expiration: Number(addReq.expiration),
                    },
                })

                return await conn.sendMessage(
                    m.chat,
                    {
                        text: `Unable to add user directly. Invitation has been sent, please wait.`,
                        mentions: [target],
                    },
                    { quoted: m }
                )
            }
        }

        return m.reply(`Failed to add the specified member.`)
    } catch (e) {
        conn.logger.error(e)
        return m.reply(`Error: ${e.message}`)
    }
}

handler.help = ["add"]
handler.tags = ["group"]
handler.command = /^add$/i
handler.group = true
handler.botAdmin = true
handler.admin = true

export default handler