/**
 * @file Message serialization and processing utility
 * @module core/smsg
 * @description Serializes WhatsApp message objects, normalizes protocol messages,
 * and adds connection context for enhanced message handling.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { proto } from "baileys";

/**
 * Symbol to mark messages as already processed
 * @constant {Symbol}
 */
const SYM_PROCESSED = Symbol.for("smsg.processed");

/**
 * Serializes and enhances WhatsApp message objects
 * @export
 * @function smsg
 * @param {Object} sock - Connection object with utilities
 * @param {Object} m - Raw message object to serialize
 * @returns {Object} Enhanced message object
 *
 * @processingSteps
 * 1. Skip already processed messages
 * 2. Convert to WebMessageInfo if needed
 * 3. Attach connection context
 * 4. Handle protocol messages (deletions)
 * 5. Normalize message keys
 * 6. Mark as processed
 *
 * @protocolMessageHandling
 * - Fixes status broadcast JIDs
 * - Resolves ambiguous participant fields
 * - Determines fromMe status accurately
 * - Emits delete events for protocol messages
 *
 * @example
 * const rawMsg = { key: { remoteJid: '123@s.whatsapp.net', ... } };
 * const serialized = smsg(connection, rawMsg);
 * // Returns enhanced message with .sock, .mtype, .sender, etc.
 */
export function smsg(sock, m) {
    // Return early for null/undefined or already processed messages
    if (!m) return m;
    if (m[SYM_PROCESSED]) {
        m.sock = sock;
        return m;
    }

    // Convert to WebMessageInfo if create method exists
    const M = proto.WebMessageInfo;
    if (M?.create) {
        m = M.create(m);
    }

    // Attach connection reference for message methods
    m.sock = sock;

    const msg = m.message;
    if (!msg) {
        m[SYM_PROCESSED] = true;
        return m;
    }

    /**
     * Special handling for protocol messages (deletions, revokes)
     * Protocol messages contain metadata about message operations
     */
    if (m.mtype === "protocolMessage" && m.msg?.key) {
        const key = { ...m.msg.key };

        // Fix status broadcast JIDs using current chat context
        if (key.remoteJid === "status@broadcast" && m.chat) {
            key.remoteJid = m.chat;
        }

        // Resolve ambiguous participant fields
        if ((!key.participant || key.participant === "status_me") && m.sender) {
            key.participant = m.sender;
        }

        // Determine if message is from the bot itself
        const botId = sock.decodeJid?.(sock.user?.lid || "") || "";
        if (botId) {
            const partId = sock.decodeJid?.(key.participant) || "";
            key.fromMe = partId === botId;

            // Fix remote JID for messages sent to the bot
            if (!key.fromMe && key.remoteJid === botId && m.sender) {
                key.remoteJid = m.sender;
            }
        }

        // Update key and emit delete event
        m.msg.key = key;
        sock.ev?.emit("messages.delete", { keys: [key] });
    }

    // Mark message as processed to prevent re-serialization
    m[SYM_PROCESSED] = true;
    return m;
}
