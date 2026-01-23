/**
 * @file URL fetcher and content analyzer
 * @module plugins/internet/fetch
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { fwa, fb, cc, gcs } from "#lib/fetch.js";

/**
 * URL fetcher and content analysis command
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} sock - Connection object
 * @param {string} text - URL and options to fetch
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Advanced URL fetcher with comprehensive content analysis, performance metrics,
 * and intelligent response handling. Supports multiple protocols, caching,
 * proxy rotation, and detailed content inspection.
 *
 * @features
 * - Multi-protocol support (HTTP/HTTPS/FTP/S3)
 * - Performance timing with progress bars
 * - Content type detection and analysis
 * - Cache management with proxy support
 * - Automatic content preview based on type
 * - Redirect chain tracking
 * - Compression detection and handling
 * - Error recovery with retry mechanism
 *
 * @supportedContent
 * - Text files (TXT, JSON, XML, HTML, CSS, JS)
 * - Images (JPEG, PNG, WebP, GIF)
 * - Videos (MP4, WebM, MOV)
 * - Audio files (MP3, MP4, OGG)
 * - Documents (PDF, archives)
 * - Web pages with HTML analysis
 */

/**
 * Formats timing information with visual progress bars
 * @private
 * @function ft
 * @param {Object} tm - Timing metrics object
 * @returns {string} Formatted timing display
 */
function ft(tm) {
    const b = (ms, mx = 5000) => {
        const p = Math.min((ms / mx) * 100, 100);
        const f = Math.floor(p / 10);
        return "▓".repeat(f) + "░".repeat(10 - f);
    };

    return `Performance:
DNS: ${tm.dns || 0}ms ${b(tm.dns)}
Connection: ${tm.cn || 0}ms ${b(tm.cn)}
Fetch: ${tm.ft}ms ${b(tm.ft)}
Download: ${tm.dl}ms ${b(tm.dl)}
Process: ${tm.pr}ms ${b(tm.pr)}
Total: ${tm.tt}ms ${b(tm.tt)}
Speed: ${tm.dr || "N/A"}`;
}

/**
 * Formats metadata analysis results
 * @private
 * @function fm
 * @param {Object} md - Content metadata
 * @returns {string} Formatted metadata display
 */
function fm(md) {
    const l = [];

    l.push(`Content Analysis:`);
    l.push(`Size: ${fb(md.sz)}`);
    l.push(`Type: ${md.dt.m}`);
    l.push(`Extension: .${md.dt.e}`);
    l.push(`Category: ${md.dt.c}`);
    l.push(`Detection: ${md.dm}`);

    if (md.json) {
        l.push(``);
        l.push(`JSON:`);
        l.push(`Valid: ${md.json.v ? "Yes" : "No"}`);
        if (md.json.v) {
            l.push(`Type: ${md.json.t}`);
            if (md.json.kc) l.push(`Keys: ${md.json.kc}`);
            if (md.json.ln !== undefined) l.push(`Length: ${md.json.ln}`);
        }
    }

    if (md.html) {
        l.push(``);
        l.push(`HTML:`);
        if (md.html.ttl) l.push(`Title: ${md.html.ttl}`);
        if (md.html.dsc) l.push(`Description: ${md.html.dsc}`);
        l.push(`Links: ${md.html.lc || 0}`);
        l.push(`Scripts: ${md.html.sc || 0}`);
        l.push(`Images: ${md.html.ic || 0}`);
    }

    if (md.txt) {
        l.push(``);
        l.push(`Text:`);
        if (md.txt.lng) l.push(`Language: ${md.txt.lng}`);
        l.push(`Lines: ${md.txt.lns.toLocaleString()}`);
        l.push(`Words: ${md.txt.wds.toLocaleString()}`);
        l.push(`Characters: ${md.txt.chs.toLocaleString()}`);
    }

    if (md.img) {
        l.push(``);
        l.push(`Image:`);
        l.push(`Format: ${md.img.fmt}`);
        if (md.img.w && md.img.h) {
            l.push(`Dimensions: ${md.img.w}x${md.img.h}px`);
        }
    }

    if (md.arc) {
        l.push(``);
        l.push(`Archive:`);
        l.push(`Format: ${md.arc.fmt}`);
    }

    if (md.pdf) {
        l.push(``);
        l.push(`PDF:`);
        l.push(`Estimated Pages: ${md.pdf.pgs}`);
    }

    return l.join("\n");
}

/**
 * Formats HTTP response headers for display
 * @private
 * @function fh
 * @param {Object} h - Response headers
 * @returns {string} Formatted headers
 */
function fh(h) {
    const l = [`Response Headers:`];

    if (h.ct) l.push(`Content-Type: ${h.ct}`);
    if (h.cl) l.push(`Content-Length: ${fb(parseInt(h.cl))}`);
    if (h.ce) l.push(`Content-Encoding: ${h.ce}`);
    if (h.sv) l.push(`Server: ${h.sv}`);
    if (h.cc) l.push(`Cache-Control: ${h.cc}`);
    if (h.lm) l.push(`Last-Modified: ${h.lm}`);
    if (h.et) l.push(`ETag: ${h.et}`);

    return l.join("\n");
}

/**
 * Formats redirect chain information
 * @private
 * @function fr
 * @param {Array} ch - Redirect chain array
 * @returns {string} Formatted redirect chain
 */
function fr(ch) {
    if (!ch || ch.length === 0) return "";

    const l = [`Redirect Chain (${ch.length}):`];
    ch.forEach((r, i) => {
        l.push(`${i + 1}. ${r.f}`);
        l.push(`-> ${r.t} (${r.s})`);
    });

    return l.join("\n") + "\n";
}

let handler = async (m, { sock, text, usedPrefix, command }) => {
    const a = text?.trim().split(/\s+/) || [];

    if (a[0] === "cache") {
        const s = gcs();
        return m.reply(`Cache: ${s.r} responses, ${s.ph} proxies, ${s.ck} cookies`);
    }

    if (a[0] === "clear") {
        cc();
        return m.reply("Caches cleared");
    }

    if (!a[0] || a[0] === "help") {
        const hp = [
            "```",
            "URL FETCHER",
            "",
            `Usage: ${usedPrefix + command} <url> [options]`,
            "",
            "Options:",
            "--no-proxy    Disable proxy",
            "--no-cache    Disable cache",
            "--no-cookies  Disable cookies",
            "--timeout N   Timeout ms (default: 30000)",
            "--max-size N  Max size bytes (default: 100MB)",
            "--retry N     Max retries (default: 3)",
            "--method X    HTTP method",
            "--referer X   Custom referer",
            "",
            "Supported Protocols:",
            "http://, https://, ftp://, s3://",
            "Raw IP: http://1.2.3.4",
            "IPv6: http://[::1]",
            "",
            "Examples:",
            `${usedPrefix + command} https://example.com`,
            `${usedPrefix + command} http://192.168.1.1`,
            `${usedPrefix + command} https://i.imgur.com/image.png`,
            `${usedPrefix + command} s3://bucket/file.json`,
            "",
            "Commands:",
            `${usedPrefix + command} cache`,
            `${usedPrefix + command} clear`,
            "```",
        ].join("\n");
        return m.reply(hp);
    }

    const u = a[0];
    const o = {
        up: !a.includes("--no-proxy"),
        cr: !a.includes("--no-cache"),
        uc: !a.includes("--no-cookies"),
    };

    const go = (fg) => {
        const i = a.indexOf(fg);
        return i !== -1 && a[i + 1] ? a[i + 1] : null;
    };

    const to = go("--timeout");
    if (to) o.to = parseInt(to) || 30000;

    const ms = go("--max-size");
    if (ms) o.ms = parseInt(ms) || 100 * 1024 * 1024;

    const rt = go("--retry");
    if (rt) o.mr = parseInt(rt) || 3;

    const mt = go("--method");
    if (mt) o.m = mt.toUpperCase();

    const rf = go("--referer");
    if (rf) o.r = rf;

    await global.loading(m, sock);

    try {
        const r = await fwa(u, o);

        if (!r.ok) {
            const e = [
                "```",
                "FETCH FAILED",
                "",
                `URL: ${u}`,
                ...(r.fu && r.fu !== u ? [`Final URL: ${r.fu}`] : []),
                ...(fr(r.rch) ? [fr(r.rch)] : []),
                `Status: ${r.s || "Failed"}`,
                `Error: ${r.er}`,
                `Time: ${r.tm?.tt || 0}ms`,
                ...(r.pu ? [`Proxy Used: ${r.pu}`] : []),
                ...(r.at > 1 ? [`Attempts: ${r.at}`] : []),
                ...(r.msg ? [``, `Error Details:`, r.msg.substring(0, 500)] : []),
                "",
                "Suggestions:",
                ...(!o.up ? ["Enable proxy (remove --no-proxy)"] : []),
                ...(o.to < 60000 ? ["Increase timeout (--timeout 60000)"] : []),
                "Check URL accessibility",
                "```",
            ].join("\n");
            return m.reply(e);
        }

        if (r.nm) {
            return m.reply(`Content Not Modified\nStatus: 304\nTime: ${r.tm.tt}ms`);
        }

        const { bf, md, tm, h, fu, rch, pu, at, crs, cmp, pt, fc } = r;

        const cp = [
            "```",
            "FETCH SUCCESS",
            "",
            `Original URL: ${u}`,
            ...(fu !== u ? [`Final URL: ${fu}`] : []),
            ...(fr(rch) ? [fr(rch)] : []),
            ...(pu ? [`Proxy: ${pu}`] : []),
            ...(at > 1 ? [`Attempt: ${at}`] : []),
            ...(fc ? [`Source: Cache`] : []),
            ...(cmp !== "none" ? [`Compression: ${cmp}`] : []),
            ...(pt ? [`Protocol: ${pt}`] : []),
            ...(crs ? [`Cookies: ${crs.length} received`] : []),
            "",
            fh(h),
            "",
            fm(md),
            "",
            ft(tm),
            "",
            `Buffer: ${fb(bf.length)}`,
            `Original Size: ${h.cl || "unknown"}`,
            "```",
        ].join("\n");

        const mime = md.dt.m;
        const ext = md.dt.e;
        const cat = md.dt.c;

        const opts = { quoted: m };
        const fn = `fetch_${Date.now()}.${ext}`;

        if (
            ext === "txt" ||
            ext === "json" ||
            ext === "md" ||
            ext === "xml" ||
            ext === "html" ||
            ext === "js" ||
            ext === "css"
        ) {
            const tx = bf.toString("utf-8");
            const mx = 50000;

            if (tx.length <= mx) {
                await m.reply(cp + "\n\n```" + ext + "\n" + tx + "\n```");
            } else {
                await m.reply(cp + "\n\nContent too large, sending as file...");
                await sock.sendMessage(
                    m.chat,
                    {
                        document: bf,
                        mimetype: mime,
                        fileName: fn,
                    },
                    opts
                );
            }
        } else if (cat === "image" && bf.length > 100) {
            await sock.sendMessage(
                m.chat,
                {
                    image: bf,
                    caption: cp,
                    jpegThumbnail: bf.length < 50000 ? bf : undefined,
                },
                opts
            );
        } else if (cat === "video" && bf.length > 1000) {
            await sock.sendMessage(
                m.chat,
                {
                    video: bf,
                    caption: cp,
                    mimetype: mime,
                },
                opts
            );
        } else if (cat === "audio" && bf.length > 100) {
            await sock.sendMessage(
                m.chat,
                {
                    audio: bf,
                    mimetype: mime,
                    fileName: fn,
                },
                opts
            );
            await m.reply(cp);
        } else {
            await sock.sendMessage(
                m.chat,
                {
                    document: bf,
                    mimetype: mime,
                    fileName: fn,
                    caption: cp,
                },
                opts
            );
        }
    } catch (e) {
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
handler.help = ["fetch"];
handler.tags = ["internet"];
handler.command = /^(fetch|get|curl|wget)$/i;

export default handler;
