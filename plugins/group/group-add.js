let handler = async (m, { conn, args, usedPrefix, command }) => {
    let target = m.quoted?.sender || null;

    if (!target && args[0]) {
        const raw = args[0].replace(/[^0-9]/g, "");
        if (raw.length >= 5) {
            target = raw + "@s.whatsapp.net";
        }
    }

    if (!target || !target.endsWith("@s.whatsapp.net")) {
        return m.reply(
            `Specify one valid member to add.\n› Example: ${usedPrefix + command} 6281234567890`
        );
    }

    try {
        const result = await conn.groupParticipantsUpdate(m.chat, [target], "add");
        const userResult = result?.[0];

        if (userResult?.status === "200") {
            return await conn.sendMessage(
                m.chat,
                {
                    text: `Successfully added @${target.split("@")[0]}.`,
                    mentions: [target],
                },
                { quoted: m }
            );
        } else if (userResult?.status === "403") {
            const groupMetadata = await conn.groupMetadata(m.chat);
            const inviteCode = await conn.groupInviteCode(m.chat);
            const groupName = groupMetadata.subject || "Unknown Subject";
            const inviteExpiration = Date.now() + 3 * 24 * 60 * 60 * 1000;

            let jpegThumbnail = null;
            try {
                const profilePic = await conn.profilePictureUrl(m.chat, "image").catch(() => null);
                if (profilePic) {
                    const response = await fetch(profilePic);
                    const buffer = await response.arrayBuffer();
                    jpegThumbnail = Buffer.from(buffer);
                }
            } catch (e) {
                conn.logger.warn({ err: e.message }, "Failed to fetch group thumbnail");
            }

            await conn.sendInviteGroup(
                m.chat,
                target,
                inviteCode,
                inviteExpiration,
                groupName,
                `Cannot add you directly. Here is the invitation to join ${groupName}`,
                jpegThumbnail,
                { mentions: [target] }
            );

            return await conn.sendMessage(
                m.chat,
                {
                    text: `Cannot add @${target.split("@")[0]} directly. Group invitation has been sent to their private chat.`,
                    mentions: [target],
                },
                { quoted: m }
            );
        } else {
            return m.reply(`Failed to add the member. Status: ${userResult?.status || "unknown"}`);
        }
    } catch (e) {
        conn.logger.error(e);
        return m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["add"];
handler.tags = ["group"];
handler.command = /^(add)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;
