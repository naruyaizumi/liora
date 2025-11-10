/*
 * Liora WhatsApp Bot
 * @description Open source WhatsApp bot based on Node.js and Baileys.
 *
 * @owner       Naruya Izumi <https://linkbio.co/naruyaizumi>
 * @developer   SXZnightmar <wa.me/6281398961382>
 
 * @copyright   © 2024 - 2025 Naruya Izumi
 * @license     Apache License 2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * IMPORTANT NOTICE:
 * - Do not sell or redistribute this source code for commercial purposes.
 * - Do not remove or alter original credits under any circumstances.
 */

global.config = {
    /*============== STAFF ==============*/
    /**
     * Owner configuration
     * Format: [local_identifier, display_name, is_moderator]
     * - local_identifier: User's native LID, NOT phone number
     * - display_name: Display name for the owner/moderator
     * - is_moderator: true (moderator) | false (owner only)
     *
     * Notes:
     * 1. Always use native LID from WhatsApp/WhiskeySocket to ensure consistency.
     * 2. Do NOT use phone numbers, as JIDs can vary across environments.
     * 3. is_moderator defines additional access rights compared to a normal owner.
     */
    // Array of bot owners and moderators with their permissions
    owner: [
        ["113748182302861", "Naruya Izumi", true],
        ["227551947555018", "SXZnightmar", true],
        // Add other owners/moderators below, same format
        // ["LOCAL_IDENTIFIER", "Owner Name", false], // Example: owner without moderator rights
    ],

    /** WhatsApp group invite link (optional) - used for bot's official group */
    group: "https://chat.whatsapp.com/FtMSX1EsGHTJeynu8QmjpG", // Full WhatsApp group invitation URL

    /** Website URL (optional) - used for external links and branding */
    website: "https://linkbio.co/naruyaizumi", // Official website or link tree

    /*============= PAIRING =============*/
    /**
     * Pairing configuration for bot connection
     *
     * pairingNumber:
     *   - Bot's phone number for pairing (without '+' or spaces)
     *   - Example: "1234567890"
     */
    pairingNumber: "212691444178", // Bot's phone number used for WhatsApp pairing authentication

    /*============== MESSAGES ==============*/
    /** Bot watermark/branding - appears in stickers and messages */
    watermark: "𝙇͢𝙞𝙤𝙧𝙖", // Bot's display name with special Unicode formatting

    /** Author name - identifies the creator in various outputs */
    author: "𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞", // Creator's name with special Unicode formatting

    /** Sticker pack name - appears when creating stickers */
    stickpack: "𝙇͢𝙞𝙤𝙧𝙖", // Pack name for stickers created by the bot

    /** Sticker pack author/copyright - appears in sticker metadata */
    stickauth: "© 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞", // Copyright notice for stickers
};

/**
 * Global loading indicator function
 * Simulates typing/composing status in WhatsApp to show bot activity
 *
 * @param {Object} m - Message object containing chat context
 * @param {Object} conn - WhatsApp connection instance
 * @param {Boolean} back - If true, clears the status; if false, shows typing indicator
 */
global.loading = async (m, conn, back = false) => {
    if (back) {
        // Set presence to "paused" (not typing)
        await conn.sendPresenceUpdate("paused", m.chat);
        // Wait 800ms for smooth transition
        await Bun.sleep(800);
        // Set presence back to "available" (online but not typing)
        await conn.sendPresenceUpdate("available", m.chat);
        return;
    }
    // Show "typing..." indicator in the chat
    await conn.sendPresenceUpdate("composing", m.chat);
};

/**
 * Global default failure handler
 * Sends standardized error messages when command execution fails due to permission/context issues
 *
 * @param {String} type - Type of failure (owner, mods, group, admin, botAdmin, restrict)
 * @param {Object} m - Message object containing chat context
 * @param {Object} conn - WhatsApp connection instance
 */
global.dfail = (type, m, conn) => {
    const msg = {
        // Error when non-owner tries to use owner-only commands
        owner: `\`\`\`
[ACCESS DENIED]
This command is restricted to the system owner only.
Contact the administrator for permission.
\`\`\``,
        // Error when non-moderator tries to use moderator commands
        mods: `\`\`\`
[ACCESS DENIED]
Moderator privileges required to execute this command.
\`\`\``,
        // Error when group-only command is used in private chat
        group: `\`\`\`
[ACCESS DENIED]
This command can only be executed within a group context.
\`\`\``,
        // Error when non-admin tries to use admin commands in a group
        admin: `\`\`\`
[ACCESS DENIED]
You must be a group administrator to perform this action.
\`\`\``,
        // Error when bot lacks admin privileges to perform an action
        botAdmin: `\`\`\`
[ACCESS DENIED]
System privileges insufficient.
Grant admin access to the bot to continue.
\`\`\``,
        // Error when feature is disabled or restricted by configuration
        restrict: `\`\`\`
[ACCESS BLOCKED]
This feature is currently restricted or disabled by configuration.
\`\`\``,
    }[type];
    if (!msg) return;
    conn.sendMessage(
        m.chat,
        {
            text: msg,
            contextInfo: {
                externalAdReply: {
                    title: "ACCESS CONTROL SYSTEM",
                    body: "Liora Secure Environment",
                    mediaType: 1,
                    thumbnailUrl: "https://qu.ax/DdwBH.jpg",
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: m }
    );
};
