/**
 * @file Group information command handler
 * @module plugins/group/infogroup
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Displays detailed information about a WhatsApp group
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @returns {Promise<void>}
 *
 * @description
 * Command to display comprehensive information about the current group.
 * Shows group metadata including members, admins, settings, and creation details.
 *
 * @features
 * - Displays group name, ID, and description
 * - Shows member count and admin list with mentions
 * - Displays group owner
 * - Shows group creation date and time
 * - Indicates ephemeral message settings
 * - Shows group announcement status
 * - Includes group profile picture if available
 * - Caches group metadata for performance
 */

let handler = async (m, { sock }) => {
    try {
        await global.loading(m, sock);

        let meta;
        try {
            const chatData = await sock.getChat(m.chat);
            if (chatData?.metadata?.participants?.length) {
                meta = chatData.metadata;
            }
        } catch {
            //
        }

        if (!meta) {
            try {
                meta = await sock.groupMetadata(m.chat);
                try {
                    const chatData = (await sock.getChat(m.chat)) || { id: m.chat };
                    chatData.metadata = meta;
                    chatData.subject = meta.subject;
                    chatData.isChats = true;
                    chatData.lastSync = Date.now();
                    await sock.setChat(m.chat, chatData);
                } catch {
                    //
                }
            } catch (e) {
                return m.reply(`Failed: ${e.message || "Unknown"}`);
            }
        }

        const members = meta.participants || [];
        const admins = members.filter((p) => p.admin);
        const owner =
            meta.owner ||
            admins.find((p) => p.admin === "superadmin")?.id ||
            m.chat.split`-`[0] + "@s.whatsapp.net";

        const adminList =
            admins.map((v, i) => `${i + 1}. @${v.id.split("@")[0]}`).join("\n") || "-";

        const ephemeralTime =
            {
                86400: "24h",
                604800: "7d",
                2592000: "30d",
                7776000: "90d",
            }[meta.ephemeralDuration] || "None";

        const creationDate = meta.creation
            ? new Date(meta.creation * 1000).toLocaleString("en-US", {
                  timeZone: "UTC",
                  dateStyle: "medium",
                  timeStyle: "short",
              })
            : "(unknown)";

        const desc = meta.desc || "(none)";
        let pp = null;
        try {
            pp = await sock.profilePictureUrl(m.chat, "image");
        } catch {
            //
        }

        const mentions = [...new Set([...admins.map((v) => v.id), owner])];

        const txt = `
Group Info

ID: ${m.chat}
Name: ${meta.subject || "(unknown)"}
Members: ${members.length}
Owner: @${owner.split("@")[0]}

Admins:
${adminList}

Desc:
${desc}

Created: ${creationDate}
Ephemeral: ${ephemeralTime}
Announce: ${meta.announce ? "Yes" : "No"}
`.trim();

        if (pp) {
            await sock.sendMessage(m.chat, {
                image: { url: pp },
                caption: txt,
                mentions,
            });
        } else {
            await sock.sendMessage(m.chat, {
                text: txt,
                mentions,
            });
        }
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, sock, true);
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} group - Whether command works only in groups
 * @property {boolean} admin - Whether user needs admin privileges
 */
handler.help = ["groupinfo"];
handler.tags = ["group"];
handler.command = /^(info(gro?up|gc))$/i;
handler.group = true;
handler.admin = true;

export default handler;
