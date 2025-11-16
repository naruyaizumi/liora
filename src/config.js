/*
 * Liora WhatsApp Bot
 * @description Open source WhatsApp bot based on Bun and Baileys.
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
     * Format: [local_identifier, display_name]
     * - local_identifier: User's native LID, NOT phone number
     * - display_name: Display name for the owner
     *
     * Notes:
     * 1. Always use native LID from WhatsApp/WhiskeySocket to ensure consistency.
     * 2. Do NOT use phone numbers, as JIDs can vary across environments.
     */
    owner: [
        ["113748182302861", "Naruya Izumi"],
        ["227551947555018", "SXZnightmar"],
        // ["LOCAL_IDENTIFIER", "Owner Name"],
    ],

    group: "https://chat.whatsapp.com/FtMSX1EsGHTJeynu8QmjpG",
    
    /*============= PAIRING =============*/
    /**
     * pairingNumber:
     *   - Bot's phone number for pairing (without '+' or spaces)
     *   - Example: "1234567890"
     */
    pairingNumber: "", // Bot's phone number used for WhatsApp pairing authentication

    watermark: "𝙇͢𝙞𝙤𝙧𝙖",
    author: "𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞",
    stickpack: "𝙇͢𝙞𝙤𝙧𝙖",
    stickauth: "© 𝙉͢𝙖𝙧𝙪𝙮𝙖 𝙄͢𝙯𝙪𝙢𝙞",
};

global.loading = async (m, conn, back = false) => {
    if (back) {
        await conn.sendPresenceUpdate("paused", m.chat);
        await Bun.sleep(800);
        await conn.sendPresenceUpdate("available", m.chat);
        return;
    }
    await conn.sendPresenceUpdate("composing", m.chat);
};

global.dfail = (type, m, conn) => {
    const msg = {
        owner: `\`\`\`
[ACCESS DENIED]
This command is restricted to the system owner only.
Contact the administrator for permission.
\`\`\``,
        group: `\`\`\`
[ACCESS DENIED]
This command can only be executed within a group context.
\`\`\``,
        admin: `\`\`\`
[ACCESS DENIED]
You must be a group administrator to perform this action.
\`\`\``,
        botAdmin: `\`\`\`
[ACCESS DENIED]
System privileges insufficient.
Grant admin access to the bot to continue.
\`\`\``,
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
