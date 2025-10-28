import { fetch } from "liora-lib";

const linkRegex =
    /\b((?:https?:\/\/|ftp:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?)/gi;
const VALID_CACHE = new Map();
const CACHE_TTL = 1000 * 60 * 60;
const MAX_CONCURRENT = 3;
const REQ_TIMEOUT = 3000;
const MIN_LINK_LEN = 5;
const MAX_CACHE_SIZE = 1000;

function normalizeUrl(raw) {
    return /^https?:\/\//i.test(raw) || /^ftp:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function cleanCache() {
    if (VALID_CACHE.size > MAX_CACHE_SIZE) {
        const now = Date.now();
        for (const [key, value] of VALID_CACHE.entries()) {
            if (now - value.ts > CACHE_TTL) {
                VALID_CACHE.delete(key);
            }
        }
        if (VALID_CACHE.size > MAX_CACHE_SIZE) {
            const entries = [...VALID_CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts);
            const toRemove = entries.slice(0, VALID_CACHE.size - MAX_CACHE_SIZE);
            toRemove.forEach(([key]) => VALID_CACHE.delete(key));
        }
    }
}

async function isValidUrlWithNetwork(url) {
    const now = Date.now();
    const cached = VALID_CACHE.get(url);
    if (cached && now - cached.ts < CACHE_TTL) return cached.ok;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQ_TIMEOUT);
    let ok = false;

    try {
        const head = await fetch(url, {
            method: "HEAD",
            redirect: "follow",
            signal: controller.signal,
        });

        if (head && (head.ok || head.status === 405 || head.status === 403)) {
            ok = true;
        }

        if (!ok) {
            clearTimeout(timeout);
            controller.abort();

            const controller2 = new AbortController();
            const timeout2 = setTimeout(() => controller2.abort(), REQ_TIMEOUT);

            try {
                const get = await fetch(url, {
                    method: "GET",
                    headers: { Range: "bytes=0-0" },
                    redirect: "follow",
                    signal: controller2.signal,
                });
                ok = !!(get && get.status >= 200 && get.status < 400);
                clearTimeout(timeout2);
            } catch {
                clearTimeout(timeout2);
            }
        } else {
            clearTimeout(timeout);
        }
    } catch (e) {
        ok = false;
        clearTimeout(timeout);
    }

    VALID_CACHE.set(url, { ok, ts: Date.now() });
    cleanCache();

    return ok;
}

async function filterResolvableLinks(urls) {
    const out = [];
    const queue = urls.slice();
    const workers = [];

    for (let i = 0; i < Math.min(MAX_CONCURRENT, queue.length); i++) {
        workers.push(
            (async function worker() {
                while (queue.length) {
                    const u = queue.shift();
                    if (!u) continue;
                    try {
                        const ok = await isValidUrlWithNetwork(u);
                        if (ok) out.push(u);
                    } catch {}
                }
            })()
        );
    }

    await Promise.allSettled(workers);
    return out;
}

export async function before(m, { conn, isOwner, isMods, isAdmin, isBotAdmin }) {
    try {
        if (m.isBaileys || m.fromMe) return true;
        if (isOwner || isMods) return true;
        if (!m.isGroup) return true;
        if (isAdmin) return true;
        const chat = global.db.data.chats[m.chat];
        if (!chat?.antiLinks || !isBotAdmin) return true;
        const contextInfo = m.message?.extendedTextMessage?.contextInfo || {};
        const linksFromContext = [
            contextInfo.inviteLink,
            contextInfo.externalAdReply?.mediaUrl,
        ].filter(Boolean);

        const text =
            m.text ||
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.extendedTextMessage?.matchedText ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption ||
            m.message?.documentMessage?.caption ||
            m.message?.buttonsResponseMessage?.selectedButtonId ||
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            linksFromContext.join(" ") ||
            "";

        if (!text) return true;

        const rawMatches = [...text.matchAll(linkRegex)].map((v) => v[0]);
        if (!rawMatches.length) return true;

        const candidates = [
            ...new Set(rawMatches.map((t) => t.trim()).filter((t) => t.length >= MIN_LINK_LEN)),
        ];

        if (!candidates.length) return true;

        const normalized = candidates.map(normalizeUrl);
        const resolvable = await filterResolvableLinks(normalized);

        if (resolvable.length > 0) {
            try {
                await conn.sendMessage(m.chat, {
                    delete: {
                        remoteJid: m.chat,
                        fromMe: false,
                        id: m.key.id,
                        participant: m.key.participant || m.sender,
                    },
                });
            } catch (e) {
                conn.logger.error(e);
            }
        }

        return true;
    } catch (e) {
        conn.logger.error(e);
        return true;
    }
}
