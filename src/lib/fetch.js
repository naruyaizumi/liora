/**
 * @file Advanced HTTP fetching utility with cookie management, proxy support,
 * content analysis, and performance metrics.
 * @module fetch
 * @license Apache-2.0
 * @author Naruya Izumi
 * @description Comprehensive URL fetcher with support for multiple protocols,
 * automatic content type detection, proxy rotation, caching, and detailed
 * metadata extraction.
 */

import { fileTypeFromBuffer } from "file-type";

const rc = new Map(); // Response cache
const pc = new Map(); // Proxy cache
const hc = new Map(); // Proxy health cache

/**
 * Cookie Jar class for managing HTTP cookies
 * @class CJ
 * @description Handles parsing, storing, and retrieving cookies with domain/path matching
 */
class CJ {
    /**
     * Creates a new Cookie Jar
     * @constructor
     */
    constructor() {
        /**
         * Internal cookie storage
         * @type {Map<string, Object>}
         * @private
         */
        this.c = new Map();
    }

    /**
     * Sets cookies from Set-Cookie header
     * @param {string} u - URL that sent the cookie
     * @param {string|string[]} h - Set-Cookie header value(s)
     */
    set(u, h) {
        if (!h) return;
        const uo = new URL(u);
        const d = uo.hostname;
        const hs = Array.isArray(h) ? h : [h];

        for (const ck of hs) {
            const pts = ck.split(";").map((s) => s.trim());
            const [nv] = pts;
            const [n, v] = nv.split("=");
            if (!n) continue;

            const cd = { v: v || "", d: d, p: "/", s: false, h: false, ss: "Lax", e: null };

            for (let i = 1; i < pts.length; i++) {
                const a = pts[i];
                const [k, val] = a.split("=").map((s) => s?.trim());
                const lk = k?.toLowerCase();

                if (lk === "domain" && val) cd.d = val.startsWith(".") ? val.slice(1) : val;
                else if (lk === "path" && val) cd.p = val;
                else if (lk === "secure") cd.s = true;
                else if (lk === "httponly") cd.h = true;
                else if (lk === "samesite" && val) cd.ss = val;
                else if (lk === "expires" && val) cd.e = new Date(val);
                else if (lk === "max-age" && val) {
                    const ma = parseInt(val);
                    if (!isNaN(ma)) cd.e = new Date(Date.now() + ma * 1000);
                }
            }

            this.c.set(`${cd.d}:${cd.p}:${n}`, { n, ...cd });
        }
    }

    /**
     * Gets cookies for a URL
     * @param {string} u - URL to get cookies for
     * @returns {string} Cookie header string
     */
    get(u) {
        const uo = new URL(u);
        const hn = uo.hostname;
        const pn = uo.pathname;
        const now = new Date();
        const vcs = [];

        for (const [key, ck] of this.c.entries()) {
            if (ck.e && ck.e < now) {
                this.c.delete(key);
                continue;
            }

            const dm = hn === ck.d || hn.endsWith("." + ck.d) || ck.d.endsWith("." + hn);
            if (!dm) continue;
            if (!pn.startsWith(ck.p)) continue;
            if (ck.s && uo.protocol !== "https:") continue;

            vcs.push(`${ck.n}=${ck.v}`);
        }

        return vcs.join("; ");
    }

    /**
     * Clears all cookies
     */
    clr() {
        this.c.clear();
    }
}

// Global cookie jar instance
const gcj = new CJ();

/**
 * Formats bytes to human readable string
 * @param {number} b - Bytes to format
 * @param {number} [d=2] - Decimal places
 * @returns {string} Formatted size string
 * @example
 * fb(1024) // "1.00 KB"
 * fb(1500000) // "1.43 MB"
 */
export function fb(b, d = 2) {
    if (b === 0) return "0 B";
    const k = 1024;
    const dm = d < 0 ? 0 : d;
    const sz = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${parseFloat((b / Math.pow(k, i)).toFixed(dm))} ${sz[i]}`;
}

/**
 * Generates random fingerprint for request headers
 * @returns {Object} Fingerprint object with platform, browser, version, OS, and UA
 * @private
 */
function gfp() {
    const pfs = [
        { o: "Windows NT 10.0; Win64; x64", p: "Windows" },
        { o: "Macintosh; Intel Mac OS X 10_15_7", p: "macOS" },
        { o: "X11; Linux x86_64", p: "Linux" },
    ];

    const brs = [
        { n: "Chrome", mv: 120, xv: 124 },
        { n: "Firefox", mv: 120, xv: 124 },
        { n: "Safari", mv: 17, xv: 18 },
    ];

    const pf = pfs[Math.floor(Math.random() * pfs.length)];
    const br = brs[Math.floor(Math.random() * brs.length)];
    const vr = Math.floor(Math.random() * (br.xv - br.mv + 1)) + br.mv;

    return {
        p: pf.p,
        b: br.n,
        v: vr,
        o: pf.o,
        ua: `Mozilla/5.0 (${pf.o}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${vr}.0.0.0 Safari/537.36`,
    };
}

/**
 * Generates browser-like HTTP headers
 * @param {string} u - Target URL
 * @param {Object} [o={}] - Options
 * @param {string} [o.m] - HTTP method
 * @param {string} [o.r] - Referer URL
 * @param {string} [o.ct] - Content-Type
 * @param {string} [o.ims] - If-Modified-Since
 * @param {string} [o.ine] - If-None-Match
 * @returns {Object} HTTP headers object
 */
export function gbh(u, o = {}) {
    const fp = gfp();
    const uo = new URL(u);

    const h = {
        "User-Agent": fp.ua,
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8,ja;q=0.7",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    };

    if (uo.protocol === "https:") {
        h["Sec-Ch-Ua"] = `"Not_A Brand";v="8", "Chromium";v="${fp.v}"`;
        h["Sec-Ch-Ua-Mobile"] = "?0";
        h["Sec-Ch-Ua-Platform"] = `"${fp.p}"`;
        h["Sec-Fetch-Dest"] = "document";
        h["Sec-Fetch-Mode"] = "navigate";
        h["Sec-Fetch-Site"] = "none";
        h["Sec-Fetch-User"] = "?1";
    }

    if (o.m && ["POST", "PUT", "PATCH"].includes(o.m.toUpperCase())) {
        h["Origin"] = uo.origin;
        h["Referer"] = o.r || uo.origin + "/";
        h["Content-Type"] = o.ct || "application/x-www-form-urlencoded";
    }

    const cks = gcj.get(u);
    if (cks) h["Cookie"] = cks;

    if (o.ims) h["If-Modified-Since"] = o.ims;
    if (o.ine) h["If-None-Match"] = o.ine;
    if (o.r && !h["Referer"]) h["Referer"] = o.r;

    return h;
}

/**
 * Converts ReadableStream to Buffer with size limiting
 * @param {ReadableStream} s - Stream to convert
 * @param {Object} [o={}] - Options
 * @param {number} [o.ms=104857600] - Max size in bytes (default 100MB)
 * @param {Function} [o.op] - Progress callback
 * @returns {Promise<Buffer>} Buffer containing stream data
 * @throws {Error} If size exceeds limit or timeout occurs
 */
export async function s2b(s, o = {}) {
    const ms = o.ms || 100 * 1024 * 1024;
    const op = o.op;

    const chs = [];
    const r = s.getReader();
    let rsz = 0;

    try {
        while (true) {
            const { done, value } = await r.read();
            if (done) break;
            if (!value || value.length === 0) continue;

            rsz += value.length;
            if (rsz > ms) throw new Error(`Size exceeds ${fb(ms)}`);

            chs.push(value);
            if (op) op({ rx: rsz, p: 0 });
        }

        const tl = chs.reduce((a, c) => a + c.length, 0);
        const cb = new Uint8Array(tl);
        let of = 0;

        for (const ch of chs) {
            cb.set(ch, of);
            of += ch.length;
        }

        return Buffer.from(cb);
    } catch (e) {
        if (e.name === "AbortError") throw new Error("Timeout");
        throw e;
    } finally {
        try {
            r.releaseLock();
        } catch {
            //
        }
    }
}

/**
 * Checks proxy health by testing connectivity
 * @param {Object} px - Proxy object
 * @returns {Promise<boolean>} True if proxy is working
 * @private
 */
async function chp(px) {
    const ck = `${px.ip}:${px.port}`;
    const ch = hc.get(ck);

    if (ch && Date.now() - ch.t < 5 * 60 * 1000) return ch.h;

    try {
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), 5000);

        const res = await fetch("https://httpbin.org/ip", {
            method: "GET",
            signal: ac.signal,
            headers: { "User-Agent": "Mozilla/5.0" },
        });

        clearTimeout(to);

        const hl = res.ok;
        hc.set(ck, { h: hl, t: Date.now() });
        return hl;
    } catch {
        hc.set(ck, { h: false, t: Date.now() });
        return false;
    }
}

/**
 * Gets proxy list with health checking
 * @param {Object} [o={}] - Options
 * @param {boolean} [o.hc=true] - Enable health checking
 * @returns {Promise<Array>} Array of proxy objects
 */
export async function gpl(o = {}) {
    const ck = "pxl";
    const ch = pc.get(ck);

    if (ch && Date.now() - ch.t < 10 * 60 * 1000) return ch.d;

    try {
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), 15000);

        const res = await fetch("https://api.nekolabs.web.id/tools/free-proxy", {
            signal: ac.signal,
        });

        clearTimeout(to);
        if (!res.ok) throw new Error(`API ${res.status}`);

        const dt = await res.json();
        if (!dt.success || !Array.isArray(dt.result)) throw new Error("Invalid API");

        let pxs = dt.result.filter((p) => p.https === "yes" && p.anonymity !== "transparent");

        pxs = pxs
            .map((p) => ({
                ...p,
                sc:
                    (p.anonymity === "elite proxy" ? 10 : 5) +
                    (p.google === "yes" ? 5 : 0) +
                    (p.https === "yes" ? 5 : 0) +
                    (p.last && p.last.includes("sec") ? 10 : 0),
            }))
            .sort((a, b) => b.sc - a.sc);

        if (o.hc !== false && pxs.length > 0) {
            await Promise.allSettled(pxs.slice(0, 5).map((px) => chp(px)));
        }

        pc.set(ck, { d: pxs, t: Date.now() });
        return pxs;
    } catch {
        if (ch) return ch.d;
        return [];
    }
}

/**
 * Detects file type from buffer
 * @param {Buffer} bf - Buffer to analyze
 * @param {string} [ct=''] - Content-Type header
 * @param {string} [u=''] - URL for extension hint
 * @returns {Promise<Object>} File type info: {m, e, c, mt}
 * @description Uses multiple detection methods: signature, magic numbers, content analysis
 */
export async function dft(bf, ct = "", u = "") {
    let m = "application/octet-stream";
    let e = "bin";
    let c = "unknown";

    try {
        const dt = await fileTypeFromBuffer(bf);
        if (dt) return { m: dt.mime, e: dt.ext, c: dt.mime.split("/")[0], mt: "sig" };
    } catch {
        //
    }

    if (ct) {
        const pm = ct.split(";")[0].trim().toLowerCase();
        if (pm && pm !== "application/octet-stream") {
            const pts = pm.split("/");
            if (pts.length === 2) {
                m = pm;
                e = pts[1].split("+")[0];
                c = pts[0];
            }
        }
    }

    if (u) {
        const ue = u.split("?")[0].split("#")[0].split(".").pop().toLowerCase();
        if (ue && ue.length <= 5 && /^[a-z0-9]+$/.test(ue)) e = ue;
    }

    if (bf.length < 4) return { m, e, c, mt: "hdr" };

    const mns = [
        { b: [0x89, 0x50, 0x4e, 0x47], m: "image/png", e: "png" },
        { b: [0xff, 0xd8, 0xff], m: "image/jpeg", e: "jpg" },
        { b: [0x47, 0x49, 0x46, 0x38], m: "image/gif", e: "gif" },
        {
            b: [0x52, 0x49, 0x46, 0x46],
            m: "image/webp",
            e: "webp",
            o: 8,
            xb: [0x57, 0x45, 0x42, 0x50],
        },
        { b: [0x42, 0x4d], m: "image/bmp", e: "bmp" },
        { b: [0x00, 0x00, 0x01, 0x00], m: "image/x-icon", e: "ico" },
        { b: [0x1a, 0x45, 0xdf, 0xa3], m: "video/webm", e: "webm" },
        { b: [0x46, 0x4c, 0x56], m: "video/x-flv", e: "flv" },
        { b: [0x49, 0x44, 0x33], m: "audio/mpeg", e: "mp3" },
        { b: [0xff, 0xfb], m: "audio/mpeg", e: "mp3" },
        { b: [0x4f, 0x67, 0x67, 0x53], m: "audio/ogg", e: "ogg" },
        { b: [0x66, 0x4c, 0x61, 0x43], m: "audio/flac", e: "flac" },
        { b: [0x50, 0x4b, 0x03, 0x04], m: "application/zip", e: "zip" },
        { b: [0x52, 0x61, 0x72, 0x21], m: "application/x-rar", e: "rar" },
        { b: [0x1f, 0x8b], m: "application/gzip", e: "gz" },
        { b: [0x42, 0x5a, 0x68], m: "application/x-bzip2", e: "bz2" },
        { b: [0x37, 0x7a, 0xbc, 0xaf], m: "application/x-7z-compressed", e: "7z" },
        { b: [0x25, 0x50, 0x44, 0x46], m: "application/pdf", e: "pdf" },
        { b: [0xd0, 0xcf, 0x11, 0xe0], m: "application/msword", e: "doc" },
        { b: [0x4d, 0x5a], m: "application/x-msdownload", e: "exe" },
        { b: [0x7f, 0x45, 0x4c, 0x46], m: "application/x-elf", e: "elf" },
    ];

    for (const mn of mns) {
        const of = mn.o || 0;
        let mt = true;

        for (let i = 0; i < mn.b.length; i++) {
            if (bf[of + i] !== mn.b[i]) {
                mt = false;
                break;
            }
        }

        if (mt && mn.xb) {
            const xo = of + mn.b.length;
            for (let i = 0; i < mn.xb.length; i++) {
                if (bf[xo + i] !== mn.xb[i]) {
                    mt = false;
                    break;
                }
            }
        }

        if (mt) return { m: mn.m, e: mn.e, c: mn.m.split("/")[0], mt: "mag" };
    }

    try {
        const sp = bf.toString("utf-8", 0, Math.min(4096, bf.length));
        const tr = sp.trim();

        if (/<(!doctype html|html|head|body)/i.test(tr))
            return { m: "text/html", e: "html", c: "text", mt: "cnt" };
        if (tr.startsWith("<?xml") || /<\?xml/i.test(tr))
            return { m: "application/xml", e: "xml", c: "application", mt: "cnt" };
        if (/<svg/i.test(tr)) return { m: "image/svg+xml", e: "svg", c: "image", mt: "cnt" };

        if (tr.startsWith("{") || tr.startsWith("[")) {
            try {
                JSON.parse(tr.length > 100000 ? tr.substring(0, 100000) : tr);
                return { m: "application/json", e: "json", c: "application", mt: "cnt" };
            } catch {
                //
            }
        }

        if (/^(import|export|const|let|var|function|class)\s/m.test(sp))
            return { m: "application/javascript", e: "js", c: "application", mt: "cnt" };
        if (/[\w-]+\s*\{[^}]*\}/.test(sp)) return { m: "text/css", e: "css", c: "text", mt: "cnt" };
        if (/^#+\s|^\*\*|^\[.*\]\(.*\)/m.test(sp))
            return { m: "text/markdown", e: "md", c: "text", mt: "cnt" };
        if (/^[\x20-\x7E\s]*$/.test(sp.substring(0, 1000)))
            return { m: "text/plain", e: "txt", c: "text", mt: "cnt" };
    } catch {
        //
    }

    return { m, e, c, mt: "def" };
}

/**
 * Extracts metadata from content based on file type
 * @param {Buffer} bf - Content buffer
 * @param {Object} dt - File type info from dft()
 * @param {string} [u=''] - URL for context
 * @returns {Object} Detailed metadata object
 */
export function em(bf, dt, u = "") {
    const md = { sz: bf.length, m: dt.m, e: dt.e, c: dt.c, dm: dt.mt, u: u };

    try {
        if (dt.m === "application/json" || dt.m.includes("json")) {
            const tx = bf.toString("utf-8");
            try {
                const js = JSON.parse(tx);
                md.json = { t: Array.isArray(js) ? "array" : typeof js, v: true };

                if (typeof js === "object" && js !== null) {
                    const ks = Object.keys(js);
                    md.json.kc = ks.length;
                    md.json.tks = ks.slice(0, 20);
                }

                if (Array.isArray(js)) md.json.ln = js.length;
            } catch (er) {
                md.json = { v: false, er: er.message };
            }
        } else if (dt.m === "text/html") {
            const tx = bf.toString("utf-8", 0, Math.min(100000, bf.length));
            md.html = {};

            const ttl = tx.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (ttl) md.html.ttl = ttl[1].trim();

            const dsc = tx.match(
                /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
            );
            if (dsc) md.html.dsc = dsc[1].trim();

            md.html.lc = (tx.match(/<link[^>]*>/gi) || []).length;
            md.html.sc = (tx.match(/<script[^>]*>/gi) || []).length;
            md.html.ic = (tx.match(/<img[^>]*>/gi) || []).length;
        } else if (dt.c === "text") {
            const tx = bf.toString("utf-8");
            const lns = tx.split("\n");

            md.txt = {
                lns: lns.length,
                chs: tx.length,
                wds: tx.trim().split(/\s+/).length,
                nlns: lns.filter((l) => l.trim().length > 0).length,
            };

            if (dt.e === "js") md.txt.lng = "JavaScript";
            else if (dt.e === "py") md.txt.lng = "Python";
            else if (dt.e === "md") md.txt.lng = "Markdown";
        } else if (dt.c === "image") {
            md.img = { fmt: dt.e.toUpperCase() };

            if (dt.e === "png" && bf.length >= 24) {
                md.img.w = bf.readUInt32BE(16);
                md.img.h = bf.readUInt32BE(20);
            } else if (dt.e === "gif" && bf.length >= 10) {
                md.img.w = bf.readUInt16LE(6);
                md.img.h = bf.readUInt16LE(8);
            }
        } else if (["zip", "rar", "gz", "7z"].includes(dt.e)) {
            md.arc = { fmt: dt.e.toUpperCase(), cmp: true };
        } else if (dt.e === "pdf") {
            const tx = bf.toString("binary", 0, Math.min(10000, bf.length));
            const pgs = tx.match(/\/Type\s*\/Page[^s]/g);
            if (pgs) md.pdf = { pgs: pgs.length };
        }
    } catch (er) {
        md.eer = er.message;
    }

    return md;
}

/**
 * Wrapper for fetch with retry logic
 * @param {string} u - URL to fetch
 * @param {Object} o - Fetch options
 * @param {Object|null} px - Proxy configuration
 * @returns {Promise<Response>} Fetch response
 * @private
 */
async function fwr(u, o, px = null) {
    const ma = o.ra || 3;
    let le;

    for (let at = 1; at <= ma; at++) {
        try {
            const fo = { ...o };
            if (px) fo.proxy = `http://${px.ip}:${px.port}`;

            const rs = await fetch(u, fo);
            if (rs.ok || rs.status < 500) return rs;

            le = new Error(`HTTP ${rs.status}`);
            if (rs.status >= 400 && rs.status < 500 && rs.status !== 429) throw le;
        } catch (er) {
            le = er;
            if (at === ma) throw er;
        }

        if (at < ma) await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, at - 1)));
    }

    throw le;
}

/**
 * Checks if URL is valid
 * @param {string} u - URL to check
 * @returns {boolean} True if valid URL
 * @private
 */
function isu(u) {
    try {
        const uo = new URL(u);
        const vps = ["http:", "https:", "ftp:", "ftps:", "ws:", "wss:", "s3:", "ipfs:"];
        return vps.includes(uo.protocol);
    } catch {
        if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(u)) return true;
        if (/^\[[\da-f:]+\](:\d+)?$/i.test(u)) return true;
        return false;
    }
}

/**
 * Normalizes URL by adding protocol if missing
 * @param {string} u - URL to normalize
 * @returns {string} Normalized URL
 * @private
 */
function nu(u) {
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(u)) return `http://${u}`;
    if (/^\[[\da-f:]+\](:\d+)?$/i.test(u)) return `http://${u}`;
    if (u.startsWith("s3://") || u.startsWith("ipfs://")) return u;
    return `https://${u}`;
}

/**
 * Main fetch function with advanced features
 * @param {string} u - URL to fetch
 * @param {Object} [o={}] - Options
 * @param {number} [o.mr=3] - Max retries
 * @param {boolean} [o.up=true] - Use proxy
 * @param {number} [o.to=30000] - Timeout in ms
 * @param {boolean} [o.fr=true] - Follow redirects
 * @param {number} [o.ra=3] - Request attempts per retry
 * @param {number} [o.ms=104857600] - Max response size (100MB)
 * @param {boolean} [o.uc=true] - Update cookies
 * @param {boolean} [o.cr=true] - Cache responses
 * @param {string} [o.m] - HTTP method
 * @param {string} [o.r] - Referer URL
 * @param {string} [o.ims] - If-Modified-Since header
 * @param {string} [o.ine] - If-None-Match header
 * @param {string} [o.ct] - Content-Type
 * @param {Object} [o.h] - Additional headers
 * @param {*} [o.b] - Request body
 * @param {Function} [o.op] - Progress callback
 * @returns {Promise<Object>} Fetch result object with comprehensive metadata
 *
 * @example
 * const result = await fwa('https://example.com');
 * if (result.ok) {
 *   console.log(`Fetched ${result.md.sz} bytes of ${result.md.dt.m}`);
 * }
 */
export async function fwa(u, o = {}) {
    const st = Date.now();
    const tm = { st: st, dns: 0, cn: 0, ft: 0, dl: 0, pr: 0, tt: 0 };

    if (!isu(u)) u = nu(u);

    const cfg = {
        mr: o.mr || 3,
        up: o.up !== false,
        to: o.to || 30000,
        fr: o.fr !== false,
        ra: o.ra || 3,
        ms: o.ms || 100 * 1024 * 1024,
        uc: o.uc !== false,
        cr: o.cr !== false,
    };

    let rch = [];
    let le = null;
    let pu = null;
    let crs = [];

    if (cfg.cr) {
        const ch = rc.get(u);
        if (ch && Date.now() - ch.t < 5 * 60 * 1000) {
            return { ...ch.d, fc: true, tm: { ...ch.d.tm, tt: Date.now() - st } };
        }
    }

    for (let at = 1; at <= cfg.mr; at++) {
        try {
            const hds = gbh(u, { m: o.m, r: o.r, ims: o.ims, ine: o.ine, ct: o.ct });

            const fo = {
                method: o.m || "GET",
                headers: { ...hds, ...(o.h || {}) },
                redirect: cfg.fr ? "follow" : "manual",
                signal: AbortSignal.timeout(cfg.to),
            };

            if (o.b) fo.body = o.b;

            const fts = Date.now();
            let rs;

            if (at === 1) {
                rs = await fwr(u, fo);
            } else if (cfg.up) {
                const pxs = await gpl({ hc: true });
                if (pxs.length === 0) throw new Error("No proxies");

                let pxs2 = false;
                for (let i = 0; i < Math.min(3, pxs.length); i++) {
                    const px = pxs[i];
                    pu = `${px.ip}:${px.port} (${px.country})`;

                    try {
                        rs = await fwr(u, fo, px);
                        pxs2 = true;
                        break;
                    } catch (pxe) {
                        if (i === Math.min(3, pxs.length) - 1) throw pxe;
                        continue;
                    }
                }

                if (!pxs2) throw new Error("All proxies failed");
            } else {
                rs = await fwr(u, fo);
            }

            tm.ft = Date.now() - fts;

            if (cfg.uc) {
                const sc = rs.headers.get("set-cookie");
                if (sc) {
                    gcj.set(rs.url, sc);
                    crs.push(sc);
                }
            }

            if (rs.redirected) rch.push({ f: u, t: rs.url, s: rs.status });

            if (rs.status === 304) {
                return {
                    ok: true,
                    nm: true,
                    s: 304,
                    st: "Not Modified",
                    tm: { ...tm, tt: Date.now() - st },
                    h: Object.fromEntries(rs.headers.entries()),
                };
            }

            if (!rs.ok) {
                const et = await rs.text().catch(() => "");

                if ((rs.status >= 500 || rs.status === 429) && at < cfg.mr) {
                    await new Promise((r) => setTimeout(r, 1000 * at));
                    continue;
                }

                return {
                    ok: false,
                    s: rs.status,
                    st: rs.statusText,
                    er: `HTTP ${rs.status}`,
                    msg: et.substring(0, 1000),
                    tm: { ...tm, tt: Date.now() - st },
                    fu: rs.url,
                    rch,
                    h: Object.fromEntries(rs.headers.entries()),
                    pu,
                    at,
                };
            }

            const prs = Date.now();
            const fu = rs.url;

            const h = {
                ct: rs.headers.get("content-type") || "unknown",
                cl: rs.headers.get("content-length"),
                ce: rs.headers.get("content-encoding"),
                te: rs.headers.get("transfer-encoding"),
                sv: rs.headers.get("server"),
                dt: rs.headers.get("date"),
                lm: rs.headers.get("last-modified"),
                et: rs.headers.get("etag"),
                cc: rs.headers.get("cache-control"),
                ex: rs.headers.get("expires"),
                ag: rs.headers.get("age"),
                xp: rs.headers.get("x-powered-by"),
                cd: rs.headers.get("content-disposition"),
                lc: rs.headers.get("location"),
            };

            const dls = Date.now();
            const bf = await s2b(rs.body, { ms: cfg.ms, op: o.op });
            tm.dl = Date.now() - dls;

            const dt = await dft(bf, h.ct, fu);
            const md = em(bf, dt, fu);

            tm.pr = Date.now() - prs;
            tm.tt = Date.now() - st;

            const dr = bf.length / (tm.tt / 1000);

            const rsl = {
                ok: true,
                bf,
                md: { ...md, dt },
                h,
                tm: { ...tm, dr: fb(dr) + "/s", as: fb(dr) },
                fu,
                ou: u,
                rd: rs.redirected,
                rch,
                s: rs.status,
                st: rs.statusText,
                pu,
                at,
                crs: crs.length > 0 ? crs : undefined,
                cmp: h.ce || "none",
                pt: new URL(fu).protocol,
            };

            if (cfg.cr && rs.ok) rc.set(u, { d: rsl, t: Date.now() });

            return rsl;
        } catch (er) {
            le = er;
            if (at >= cfg.mr) break;
            await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, at - 1)));
        }
    }

    return {
        ok: false,
        er: le?.name || "FetchError",
        msg: le?.message || "Unknown error",
        stk: le?.stack,
        tm: { ...tm, tt: Date.now() - st },
        s: "Failed",
        ou: u,
        rch,
        pu,
        ats: cfg.mr,
    };
}

/**
 * Clears all caches (response, proxy, health, cookies)
 */
export function cc() {
    rc.clear();
    pc.clear();
    hc.clear();
    gcj.clr();
}

/**
 * Gets cache statistics
 * @returns {Object} Cache statistics object
 */
export function gcs() {
    return {
        r: rc.size,
        d: 0,
        ph: hc.size,
        ck: gcj.c.size,
    };
}

/**
 * Default export: main fetch function
 * @default
 */
export default fwa;
