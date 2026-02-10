/**
 * @file Group management command handler
 * @module plugins/group/group
 * @license Apache-2.0
 * @author Naruya Izumi
 */

let handler = async (m, { sock, args, usedPrefix, command, participants, groupMetadata }) => {
    const subcommand = (args[0] || "").toLowerCase();

    if (!subcommand) {
        return m.reply(`*Group Management Commands*

*Usage:*
│ • ${usedPrefix + command} open / ${usedPrefix + command} o
│ • ${usedPrefix + command} close / ${usedPrefix + command} c
│ • ${usedPrefix + command} add [number/@mention] / ${usedPrefix + command} a [number/@mention]
│ • ${usedPrefix + command} kick [number/@mention] / ${usedPrefix + command} k [number/@mention]
│ • ${usedPrefix + command} promote [number/@mention] / ${usedPrefix + command} p [number/@mention]
│ • ${usedPrefix + command} demote [number/@mention] / ${usedPrefix + command} d [number/@mention]
│ • ${usedPrefix + command} link / ${usedPrefix + command} l
│ • ${usedPrefix + command} revoke / ${usedPrefix + command} r

*Examples:*
│ • ${usedPrefix + command} open
│ • ${usedPrefix + command} o
│ • ${usedPrefix + command} close
│ • ${usedPrefix + command} c
│ • ${usedPrefix + command} add 6281234567890
│ • ${usedPrefix + command} a 6281234567890
│ • ${usedPrefix + command} add @mention
│ • ${usedPrefix + command} a @mention
│ • ${usedPrefix + command} kick 6281234567890
│ • ${usedPrefix + command} k 6281234567890
│ • ${usedPrefix + command} kick @mention
│ • ${usedPrefix + command} k @mention
│ • ${usedPrefix + command} promote 6281234567890
│ • ${usedPrefix + command} p 6281234567890
│ • ${usedPrefix + command} promote @mention
│ • ${usedPrefix + command} p @mention
│ • ${usedPrefix + command} demote 6281234567890
│ • ${usedPrefix + command} d 6281234567890
│ • ${usedPrefix + command} demote @mention
│ • ${usedPrefix + command} d @mention
│ • ${usedPrefix + command} link
│ • ${usedPrefix + command} l
│ • ${usedPrefix + command} revoke
│ • ${usedPrefix + command} r

*Note:* For member commands (add/kick/promote/demote), you can also reply to user's message`);
    }

    const getTargetUser = (arg) => {
        let target = m.mentionedJid?.[0] || m.quoted?.sender || null;

        if (!target && arg) {
            const num = arg.replace(/[^0-9]/g, "");
            if (num.length >= 5) {
                const jid = num + "@s.whatsapp.net";
                const lid = sock.signalRepository?.lidMapping?.getLIDForPN?.(jid);
                target = lid || jid;
            }
        }

        if (!target && arg) {
            const raw = arg.replace(/[^0-9]/g, "") + "@lid";
            if (participants?.some(p => p.id === raw)) target = raw;
        }

        return target;
    };

    const inGroup = (t) => participants?.some(p => p.id === t);

    try {
        if (subcommand === "o" || subcommand === "open") {
            await sock.groupSettingUpdate(m.chat, "not_announcement");
            return m.reply("Group opened - all members can send messages");
        }

        if (subcommand === "c" || subcommand === "close") {
            await sock.groupSettingUpdate(m.chat, "announcement");
            return m.reply("Group closed - only admins can send messages");
        }

        if (subcommand === "a" || subcommand === "add") {
            const t = getTargetUser(args[1]);
            if (!t) {
                return m.reply(`*Add Member*

*Usage:*
│ • ${usedPrefix + command} add [number/@mention]
│ • ${usedPrefix + command} a [number/@mention]

*Examples:*
│ • ${usedPrefix + command} add 6281234567890
│ • ${usedPrefix + command} a 6281234567890
│ • ${usedPrefix + command} add @mention
│ • ${usedPrefix + command} a @mention
│ • Reply to user's message with ${usedPrefix + command} add or ${usedPrefix + command} a`);
            }

            const res = await sock.groupParticipantsUpdate(m.chat, [t], "add");
            const u = res?.[0];
            if (u?.status === "200") {
                return sock.sendMessage(m.chat, { text: `Added @${t.split("@")[0]}`, mentions: [t] }, { quoted: m });
            }
            return m.reply(`Failed to add. Status: ${u?.status || "unknown"}`);
        }

        if (subcommand === "k" || subcommand === "kick") {
            const t = getTargetUser(args[1]);
            if (!inGroup(t)) {
                return m.reply(`*Remove Member*

*Usage:*
│ • ${usedPrefix + command} kick [number/@mention]
│ • ${usedPrefix + command} k [number/@mention]

*Examples:*
│ • ${usedPrefix + command} kick 6281234567890
│ • ${usedPrefix + command} k 6281234567890
│ • ${usedPrefix + command} kick @mention
│ • ${usedPrefix + command} k @mention
│ • Reply to user's message with ${usedPrefix + command} kick or ${usedPrefix + command} k`);
            }

            await sock.groupParticipantsUpdate(m.chat, [t], "remove");
            return sock.sendMessage(m.chat, { text: `Removed @${t.split("@")[0]}`, mentions: [t] }, { quoted: m });
        }

        if (subcommand === "p" || subcommand === "promote") {
            const t = getTargetUser(args[1]);
            if (!inGroup(t)) {
                return m.reply(`*Promote Member*

*Usage:*
│ • ${usedPrefix + command} promote [number/@mention]
│ • ${usedPrefix + command} p [number/@mention]

*Examples:*
│ • ${usedPrefix + command} promote 6281234567890
│ • ${usedPrefix + command} p 6281234567890
│ • ${usedPrefix + command} promote @mention
│ • ${usedPrefix + command} p @mention
│ • Reply to user's message with ${usedPrefix + command} promote or ${usedPrefix + command} p`);
            }

            await sock.groupParticipantsUpdate(m.chat, [t], "promote");
            return sock.sendMessage(m.chat, { text: `Promoted @${t.split("@")[0]}`, mentions: [t] }, { quoted: m });
        }

        if (subcommand === "d" || subcommand === "demote") {
            const t = getTargetUser(args[1]);
            if (!inGroup(t)) {
                return m.reply(`*Demote Member*

*Usage:*
│ • ${usedPrefix + command} demote [number/@mention]
│ • ${usedPrefix + command} d [number/@mention]

*Examples:*
│ • ${usedPrefix + command} demote 6281234567890
│ • ${usedPrefix + command} d 6281234567890
│ • ${usedPrefix + command} demote @mention
│ • ${usedPrefix + command} d @mention
│ • Reply to user's message with ${usedPrefix + command} demote or ${usedPrefix + command} d`);
            }

            await sock.groupParticipantsUpdate(m.chat, [t], "demote");
            return sock.sendMessage(m.chat, { text: `Demoted @${t.split("@")[0]}`, mentions: [t] }, { quoted: m });
        }

        if (subcommand === "l" || subcommand === "link") {
            const invite = await sock.groupInviteCode(m.chat);
            const link = `https://chat.whatsapp.com/${invite}`;
            await sock.client(m.chat, {
                text: `Group: ${groupMetadata.subject}\nID: ${m.chat}`,
                title: "Group Link",
                footer: "Click button to copy",
                interactiveButtons: [{
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Copy",
                        copy_code: link
                    })
                }]
            });
            return;
        }

        if (subcommand === "r" || subcommand === "revoke") {
            await sock.groupRevokeInvite(m.chat);
            return m.reply("Group link revoked and reset");
        }

        return m.reply(`Invalid subcommand. Available commands:
│ • open / o - Open group
│ • close / c - Close group
│ • add / a - Add member
│ • kick / k - Remove member
│ • promote / p - Promote to admin
│ • demote / d - Demote from admin
│ • link / l - Get group link
│ • revoke / r - Revoke link`);
    } catch (e) {
        return m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["group"];
handler.tags = ["group"];
handler.command = /^(g|group)$/i;
handler.group = true;
handler.botAdmin = true;
handler.admin = true;

export default handler;