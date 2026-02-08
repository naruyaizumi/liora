/**
 * @file Group management command handler
 * @module plugins/group/group
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Unified group management command with multiple subcommands
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {Array} args - Command arguments
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @param {Array} participants - Group participants list
 * @param {Object} groupMetadata - Group metadata object
 * @returns {Promise<void>}
 *
 * @description
 * Unified group management command with multiple subcommands:
 * - open/close: Toggle group announcement settings
 * - add: Add members to group
 * - kick: Remove members from group
 * - promote: Promote members to admin
 * - demote: Demote admins to member
 * - link: Get group invitation link
 * - revoke: Revoke and reset group link
 *
 * @features
 * - Single command with multiple subcommands
 * - Supports both full and short command names
 * - Consistent user identification (mention, reply, phone, LID)
 * - Interactive link display with copy button
 * - Proper admin privilege validation
 */

let handler = async (m, { sock, args, usedPrefix, command, participants, groupMetadata }) => {
    const subcommand = (args[0] || "").toLowerCase();
    
    if (!subcommand) {
        return m.reply(
            `*Group Management Commands*\n\n` +
            `*Usage:*\n` +
            `│ • ${usedPrefix + command} open / ${usedPrefix + command} o\n` +
            `│ • ${usedPrefix + command} close / ${usedPrefix + command} c\n` +
            `│ • ${usedPrefix + command} add [number/@mention] / ${usedPrefix + command} a [number/@mention]\n` +
            `│ • ${usedPrefix + command} kick [number/@mention] / ${usedPrefix + command} k [number/@mention]\n` +
            `│ • ${usedPrefix + command} promote [number/@mention] / ${usedPrefix + command} p [number/@mention]\n` +
            `│ • ${usedPrefix + command} demote [number/@mention] / ${usedPrefix + command} d [number/@mention]\n` +
            `│ • ${usedPrefix + command} link / ${usedPrefix + command} l\n` +
            `│ • ${usedPrefix + command} revoke / ${usedPrefix + command} r\n\n` +
            `*Examples:*\n` +
            `│ • ${usedPrefix + command} open\n` +
            `│ • ${usedPrefix + command} o\n` +
            `│ • ${usedPrefix + command} close\n` +
            `│ • ${usedPrefix + command} c\n` +
            `│ • ${usedPrefix + command} add 6281234567890\n` +
            `│ • ${usedPrefix + command} a 6281234567890\n` +
            `│ • ${usedPrefix + command} add @mention\n` +
            `│ • ${usedPrefix + command} a @mention\n` +
            `│ • ${usedPrefix + command} kick 6281234567890\n` +
            `│ • ${usedPrefix + command} k 6281234567890\n` +
            `│ • ${usedPrefix + command} kick @mention\n` +
            `│ • ${usedPrefix + command} k @mention\n` +
            `│ • ${usedPrefix + command} promote 6281234567890\n` +
            `│ • ${usedPrefix + command} p 6281234567890\n` +
            `│ • ${usedPrefix + command} promote @mention\n` +
            `│ • ${usedPrefix + command} p @mention\n` +
            `│ • ${usedPrefix + command} demote 6281234567890\n` +
            `│ • ${usedPrefix + command} d 6281234567890\n` +
            `│ • ${usedPrefix + command} demote @mention\n` +
            `│ • ${usedPrefix + command} d @mention\n` +
            `│ • ${usedPrefix + command} link\n` +
            `│ • ${usedPrefix + command} l\n` +
            `│ • ${usedPrefix + command} revoke\n` +
            `│ • ${usedPrefix + command} r\n\n` +
            `*Note:* For member commands (add/kick/promote/demote), you can also reply to user's message`
        );
    }
    
    const getTargetUser = (arg) => {
        let target = m.mentionedJid?.[0] || m.quoted?.sender || null;
        
        if (!target && arg) {
            const num = arg.replace(/[^0-9]/g, "");
            if (num.length >= 5) {
                const phoneJid = num + "@s.whatsapp.net";
                const lid = sock.signalRepository?.lidMapping?.getLIDForPN?.(phoneJid);
                target = lid || phoneJid;
            }
        }
        
        if (!target && arg) {
            const raw = arg.replace(/[^0-9]/g, "") + "@lid";
            if (participants?.some(p => p.id === raw)) target = raw;
        }
        
        return target;
    };

    const validateUserInGroup = (target) => {
        if (!target) return false;
        return participants?.some(p => p.id === target);
    };

    try {
        if (subcommand === 'o' || subcommand === 'open') {
            await sock.groupSettingUpdate(m.chat, "not_announcement");
            return m.reply("Group opened - all members can send messages");
        }

        if (subcommand === 'c' || subcommand === 'close') {
            await sock.groupSettingUpdate(m.chat, "announcement");
            return m.reply("Group closed - only admins can send messages");
        }

        if (subcommand === 'a' || subcommand === 'add') {
            const target = getTargetUser(args[1]);
            
            if (!target?.endsWith("@s.whatsapp.net") && !target?.endsWith("@lid")) {
                return m.reply(
                    `*Add Member*\n\n` +
                    `*Usage:*\n` +
                    `│ • ${usedPrefix + command} add [number/@mention]\n` +
                    `│ • ${usedPrefix + command} a [number/@mention]\n\n` +
                    `*Examples:*\n` +
                    `│ • ${usedPrefix + command} add 6281234567890\n` +
                    `│ • ${usedPrefix + command} a 6281234567890\n` +
                    `│ • ${usedPrefix + command} add @mention\n` +
                    `│ • ${usedPrefix + command} a @mention\n` +
                    `│ • Reply to user's message with ${usedPrefix + command} add or ${usedPrefix + command} a`
                );
            }

            try {
                const res = await sock.groupParticipantsUpdate(m.chat, [target], "add");
                const user = res?.[0];

                if (user?.status === "200") {
                    return sock.sendMessage(
                        m.chat,
                        {
                            text: `Added @${target.split("@")[0]}`,
                            mentions: [target],
                        },
                        { quoted: m }
                    );
                }

                return m.reply(`Failed to add. Status: ${user?.status || "unknown"}`);
            } catch (e) {
                return m.reply(`Error: ${e.message}`);
            }
        }

        if (subcommand === 'k' || subcommand === 'kick') {
            const target = getTargetUser(args[1]);
            
            if (!validateUserInGroup(target)) {
                return m.reply(
                    `*Remove Member*\n\n` +
                    `*Usage:*\n` +
                    `│ • ${usedPrefix + command} kick [number/@mention]\n` +
                    `│ • ${usedPrefix + command} k [number/@mention]\n\n` +
                    `*Examples:*\n` +
                    `│ • ${usedPrefix + command} kick 6281234567890\n` +
                    `│ • ${usedPrefix + command} k 6281234567890\n` +
                    `│ • ${usedPrefix + command} kick @mention\n` +
                    `│ • ${usedPrefix + command} k @mention\n` +
                    `│ • Reply to user's message with ${usedPrefix + command} kick or ${usedPrefix + command} k`
                );
            }

            await sock.groupParticipantsUpdate(m.chat, [target], "remove");

            return sock.sendMessage(
                m.chat,
                {
                    text: `Removed @${target.split("@")[0]}`,
                    mentions: [target],
                },
                { quoted: m }
            );
        }

        if (subcommand === 'p' || subcommand === 'promote') {
            const target = getTargetUser(args[1]);
            
            if (!validateUserInGroup(target)) {
                return m.reply(
                    `*Promote Member*\n\n` +
                    `*Usage:*\n` +
                    `│ • ${usedPrefix + command} promote [number/@mention]\n` +
                    `│ • ${usedPrefix + command} p [number/@mention]\n\n` +
                    `*Examples:*\n` +
                    `│ • ${usedPrefix + command} promote 6281234567890\n` +
                    `│ • ${usedPrefix + command} p 6281234567890\n` +
                    `│ • ${usedPrefix + command} promote @mention\n` +
                    `│ • ${usedPrefix + command} p @mention\n` +
                    `│ • Reply to user's message with ${usedPrefix + command} promote or ${usedPrefix + command} p`
                );
            }

            await sock.groupParticipantsUpdate(m.chat, [target], "promote");

            return sock.sendMessage(
                m.chat,
                {
                    text: `Promoted @${target.split("@")[0]}`,
                    mentions: [target],
                },
                { quoted: m }
            );
        }

        if (subcommand === 'd' || subcommand === 'demote') {
            const target = getTargetUser(args[1]);
            
            if (!validateUserInGroup(target)) {
                return m.reply(
                    `*Demote Member*\n\n` +
                    `*Usage:*\n` +
                    `│ • ${usedPrefix + command} demote [number/@mention]\n` +
                    `│ • ${usedPrefix + command} d [number/@mention]\n\n` +
                    `*Examples:*\n` +
                    `│ • ${usedPrefix + command} demote 6281234567890\n` +
                    `│ • ${usedPrefix + command} d 6281234567890\n` +
                    `│ • ${usedPrefix + command} demote @mention\n` +
                    `│ • ${usedPrefix + command} d @mention\n` +
                    `│ • Reply to user's message with ${usedPrefix + command} demote or ${usedPrefix + command} d`
                );
            }

            await sock.groupParticipantsUpdate(m.chat, [target], "demote");

            return sock.sendMessage(
                m.chat,
                {
                    text: `Demoted @${target.split("@")[0]}`,
                    mentions: [target],
                },
                { quoted: m }
            );
        }

        if (subcommand === 'l' || subcommand === 'link') {
            const invite = await sock.groupInviteCode(m.chat);
            const link = `https://chat.whatsapp.com/${invite}`;
            const txt = `Group: ${groupMetadata.subject}\nID: ${m.chat}`;

            await sock.client(m.chat, {
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
            return;
        }

        if (subcommand === 'r' || subcommand === 'revoke') {
            await sock.groupRevokeInvite(m.chat);
            return m.reply("Group link revoked and reset");
        }

        return m.reply(
            `Invalid subcommand. Available commands:\n` +
            `│ • open / o - Open group\n` +
            `│ • close / c - Close group\n` +
            `│ • add / a - Add member\n` +
            `│ • kick / k - Remove member\n` +
            `│ • promote / p - Promote to admin\n` +
            `│ • demote / d - Demote from admin\n` +
            `│ • link / l - Get group link\n` +
            `│ • revoke / r - Revoke link`
        );

    } catch (e) {
        return m.reply(`Error: ${e.message}`);
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 * @property {boolean} group - Whether command works only in groups
 * @property {boolean} botAdmin - Whether bot needs admin privileges
 * @property {boolean} admin - Whether user needs admin privileges
 */
handler.help = ["group"];
handler.tags = ["group"];
handler.command = /^(g|group)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;