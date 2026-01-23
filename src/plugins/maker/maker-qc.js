/**
 * @file Quote chat sticker generator command handler
 * @module plugins/maker/quotechat
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { sticker } from "#lib/sticker.js";

/**
 * Generates quote chat stickers from text or quoted messages
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} text - Message text
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Creates stylish quote chat stickers with user profile picture and name.
 * Supports both direct text input and quoted messages.
 *
 * @features
 * - Generates quote chat stickers with profile pictures
 * - Supports both text input and quoted messages
 * - Uses NekoLabs Canvas API
 * - Applies custom sticker pack metadata
 * - Falls back to default avatar if no profile picture
 */

let handler = async (m, { sock, text, usedPrefix, command }) => {
    try {
        const raw = m.quoted?.text || text || "";
        const txt = raw.replace(new RegExp(`^\\${usedPrefix}${command}\\s*`, "i"), "").trim();

        if (!txt) {
            return m.reply(`Need text\nEx: ${usedPrefix + command} Hello World`);
        }

        const name = (await m.quoted?.name) || m.pushName || (await m.name) || "Anon";
        const jid = m.quoted?.sender || m.sender;
        const pp = await sock.profilePictureUrl(jid, "image").catch(() => null);
        const ava = pp || "https://qu.ax/yqEpZ.jpg";

        await global.loading(m, sock);

        const url = `https://api.nekolabs.web.id/canvas/quote-chat?text=${encodeURIComponent(
            txt
        )}&name=${encodeURIComponent(name)}&profile=${encodeURIComponent(ava)}&color=%23000000`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("API request failed");

        const buf = Buffer.from(await res.arrayBuffer());
        const stc = await sticker(buf, {
            packName: global.config.stickpack || "",
            authorName: global.config.stickauth || "",
        });

        await sock.sendMessage(m.chat, { sticker: stc }, { quoted: m });
    } catch (e) {
        sock.logger.error(e);
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
 */
handler.help = ["qc"];
handler.tags = ["maker"];
handler.command = /^(qc)$/i;

export default handler;
