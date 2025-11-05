let handler = async (m, { conn }) => {
    try {
        await global.loading(m, conn);
        let groupMeta;

        if (conn.chats[m.chat]?.metadata) {
            groupMeta = conn.chats[m.chat].metadata;
        } else {
            return m.reply("Group metadata is not available. Please run groupUp first.");
        }

        const participants = groupMeta.participants || [];
        const groupAdmins = participants.filter((p) => p.admin);
        const owner =
            groupMeta.owner ||
            groupAdmins.find((p) => p.admin === "superadmin")?.id ||
            m.chat.split`-`[0] + "@s.whatsapp.net";

        const listAdmin =
            groupAdmins.map((v, i) => `${i + 1}. @${v.id.split("@")[0]}`).join("\n") || "-";

        const sWelcome = global.db.data.chats[m.chat]?.sWelcome || "(none)";
        const sBye = global.db.data.chats[m.chat]?.sBye || "(none)";

        const ephemeralTime = (() => {
            switch (groupMeta.ephemeralDuration) {
                case 86400:
                    return "24 hours";
                case 604800:
                    return "7 days";
                case 2592000:
                    return "30 days";
                case 7776000:
                    return "90 days";
                default:
                    return "None";
            }
        })();

        const creationDate = groupMeta.creation
            ? new Date(groupMeta.creation * 1000).toLocaleString("en-US", {
                  timeZone: "UTC",
                  dateStyle: "medium",
                  timeStyle: "short",
              })
            : "(unknown)";

        const desc = groupMeta.desc || "(none)";
        let pp = null;
        try {
            pp = await conn.profilePictureUrl(m.chat, "image");
        } catch (e) {
            conn.logger.warn(`No profile picture for group ${m.chat}: ${e.message}`);
        }

        const mentions = [...new Set([...groupAdmins.map((v) => v.id), owner])];

        const text = `
『 Group Information 』

ID: ${m.chat}
Name: ${groupMeta.subject || "(unknown)"}
Members: ${participants.length}
Owner: @${owner.split("@")[0]}

Administrators:
${listAdmin}

Welcome Message: ${sWelcome}
Leave Message: ${sBye}

Description:
${desc}

Creation: ${creationDate}
Ephemeral Timer: ${ephemeralTime}
Announcement Only: ${groupMeta.announce ? "Yes" : "No"}
`.trim();

        if (pp) {
            await conn.sendMessage(m.chat, {
                image: { url: pp },
                caption: text,
                mentions: mentions,
            });
        } else {
            await conn.sendMessage(m.chat, {
                text: text,
                mentions: mentions,
            });
        }
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["groupinfo"];
handler.tags = ["group"];
handler.command = /^(groupinfo|info(gro?up|gc))$/i;
handler.group = true;
handler.admin = true;

export default handler;
