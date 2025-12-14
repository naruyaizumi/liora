import pino from "pino";

export const logger = pino({
    level: "info",
    base: { module: "STORE" },
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM",
            ignore: "pid,hostname",
        },
    },
});

export const isGroup = (id) => typeof id === "string" && id.endsWith("@g.us");
export const isStatus = (id) => !id || id === "status@broadcast";
export const isBroadcast = (id) => id?.endsWith("@broadcast");
export const isPrivateChat = (id) => id?.endsWith("@s.whatsapp.net");

export function sanitizeJid(jid) {
    if (!jid) return null;
    if (typeof jid !== "string") return null;

    try {
        const parts = jid.split("@");
        if (parts.length !== 2) return null;
        return `${parts[0]}@${parts[1]}`;
    } catch (err) {
        logger.debug({ err, jid }, "Failed to sanitize JID");
        return null;
    }
}

export function validateJid(jid) {
    if (!jid || typeof jid !== "string") return false;
    if (isStatus(jid)) return false;

    const parts = jid.split("@");
    if (parts.length !== 2) return false;

    const domain = parts[1];
    const validDomains = ["s.whatsapp.net", "g.us", "broadcast"];

    return validDomains.includes(domain);
}
