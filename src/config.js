/*
 * Liora WhatsApp Bot
 * @description Open source WhatsApp bot based on Node.js and Baileys.
 *
 * @owner       Naruya Izumi <https://linkbio.co/naruyaizumi>
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

import "dotenv/config";

const PRESENCE_DELAY = 800;
const DEFAULT_THUMBNAIL = "https://qu.ax/DdwBH.jpg";

const safeJSONParse = (jsonString, fallback) => {
    try {
        if (!jsonString || jsonString.trim() === "") {
            return fallback;
        }
        const parsed = JSON.parse(jsonString);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
};

const sanitizeUrl = (url, fallback) => {
    try {
        if (!url) return fallback;
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") {
            return fallback;
        }
        return url;
    } catch {
        return fallback;
    }
};

const initializeConfig = () => {
    const owners = safeJSONParse(process.env.OWNERS, []);
    global.config = {};
    if (!Array.isArray(owners)) {
        global.config.owner = [];
    } else {
        global.config.owner = owners.filter(
            (owner) => typeof owner === "string" && owner.trim() !== ""
        );
    }

    return {
        /*============== STAFF ==============*/
        owner: global.config.owner,
        group: (process.env.GROUP_LINK || "").trim(),

        /*============= PAIRING =============*/
        pairingNumber: (process.env.PAIRING_NUMBER || "").trim(),

        /*============== META ===============*/
        watermark: (process.env.WATERMARK || "Liora").trim(),
        author: (process.env.AUTHOR || "Naruya Izumi").trim(),
        stickpack: (process.env.STICKPACK || "Liora").trim(),
        stickauth: (process.env.STICKAUTH || "© Naruya Izumi").trim(),

        /*============ INTERNAL =============*/
        thumbnailUrl: sanitizeUrl(process.env.THUMBNAIL_URL, DEFAULT_THUMBNAIL),
    };
};

global.config = initializeConfig();

global.loading = async (m, conn, back = false) => {
    if (!conn || !m || !m.chat) {
        return;
    }

    try {
        if (back) {
            await conn.sendPresenceUpdate("paused", m.chat);
            await new Promise((resolve) => setTimeout(resolve, PRESENCE_DELAY));
            await conn.sendPresenceUpdate("available", m.chat);
        } else {
            await conn.sendPresenceUpdate("composing", m.chat);
        }
    } catch {
        //
    }
};

const FAILURE_MESSAGES = {
    owner: {
        title: "[ACCESS DENIED]",
        body: "This command is restricted to the system owner only.\nContact the administrator for permission.",
    },
    group: {
        title: "[ACCESS DENIED]",
        body: "This command can only be executed within a group context.",
    },
    admin: {
        title: "[ACCESS DENIED]",
        body: "You must be a group administrator to perform this action.",
    },
    botAdmin: {
        title: "[ACCESS DENIED]",
        body: "System privileges insufficient.\nGrant admin access to the bot to continue.",
    },
    restrict: {
        title: "[ACCESS BLOCKED]",
        body: "This feature is currently restricted or disabled by configuration.",
    },
};

global.dfail = async (type, m, conn) => {
    if (!type || !m || !conn) {
        return;
    }
    if (!m.chat) {
        return;
    }

    const failureConfig = FAILURE_MESSAGES[type];

    if (!failureConfig) {
        return;
    }

    const messageText = `\`\`\`\n${failureConfig.title}\n${failureConfig.body}\n\`\`\``;

    try {
        await conn.sendMessage(
            m.chat,
            {
                text: messageText,
                contextInfo: {
                    externalAdReply: {
                        title: "ACCESS CONTROL SYSTEM",
                        body: "Liora Secure Environment",
                        mediaType: 1,
                        thumbnailUrl: global.config.thumbnailUrl || DEFAULT_THUMBNAIL,
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    } catch {
        try {
            await conn.sendMessage(m.chat, { text: messageText }, { quoted: m });
        } catch {
            //
        }
    }
};
