/**
 * @file Brat sticker generator command handler
 * @module plugins/maker/brat
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { sticker } from "#lib/sticker.js";

/**
 * Generates a brat-style sticker with custom text
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
 * @param {Array<string>} args - Command arguments
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Generates stylized brat-themed stickers with custom text overlay.
 * Uses NekoLabs Canvas API for image generation.
 *
 * @features
 * - Generates brat-style stickers with custom text
 * - Uses NekoLabs Canvas API
 * - Applies custom sticker pack metadata
 * - Handles API errors gracefully
 */

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        if (!args[0]) {
            return m.reply(`Need text\nEx: ${usedPrefix + command} Konichiwa~`);
        }

        await global.loading(m, conn);

        const res = await fetch(
            `https://api.nekolabs.web.id/canvas/brat/v1?text=${encodeURIComponent(args.join(" "))}`
        );
        if (!res.ok) throw new Error("API request failed");

        const buf = Buffer.from(await res.arrayBuffer());
        const stc = await sticker(buf, {
            packName: global.config.stickpack || "",
            authorName: global.config.stickauth || "",
        });

        await conn.sendMessage(
            m.chat,
            { sticker: stc },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["brat"];
handler.tags = ["maker"];
handler.command = /^(brat)$/i;

export default handler;