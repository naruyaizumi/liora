/**
 * @file Universal downloader core functions
 * @module lib/downloader
 * @license Apache-2.0
 * @author Naruya Izumi
 */

const TT = /https?:\/\/(www\.)?(vm\.|vt\.|m\.)?tiktok\.com\/[^\s]+/gi;
const IG = /https?:\/\/(www\.)?instagram\.com\/[^\s]+/gi;
const MF = /https?:\/\/(www\.)?mediafire\.com\/[^\s]+/gi;
const PIN = /https?:\/\/(www\.)?(pinterest\.(com|fr|de|co\.uk|jp|ru|ca|it|com\.au|com\.mx|com\.br|es|pl)|pin\.it)\/[^\s]+/gi;
const FB = /https?:\/\/(www\.|m\.|web\.)?facebook\.com\/[^\s]+/gi;
const TW = /https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\s]+/gi;
const VD = /https?:\/\/(www\.)?videy\.co\/[^\s]+/gi;
const TH = /https?:\/\/(www\.)?threads\.(net|com)\/[^\s]+/gi;
const MG = /https?:\/\/mega\.nz\/[^\s]+/gi;
const SC = /https?:\/\/(www\.|on\.)?soundcloud\.com\/[^\s]+/gi;
const SP = /https?:\/\/open\.spotify\.com\/[^\s]+/gi;
const YT = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[^\s]+/gi;
const SF = /https?:\/\/sfile\.co\/[^\s]+/gi;

/**
 * Extract URL dari text, return { type, url } atau null
 */
export const ext = (txt) => {
    if (!txt) return null;

    const clean = (m) => m?.[0]?.replace(/[.,!?]$/, '');

    let m = txt.match(TT);
    if (m) return { type: "tt", url: clean(m) };

    m = txt.match(IG);
    if (m && !clean(m).includes('/stories/')) return { type: "ig", url: clean(m) };

    m = txt.match(PIN);
    if (m) return { type: "pin", url: clean(m) };

    m = txt.match(FB);
    if (m) {
        const u = clean(m);
        if (!u.includes('/login') && !u.includes('/dialog') && !u.includes('/plugins/')) {
            return { type: "fb", url: u };
        }
    }

    m = txt.match(TW);
    if (m) return { type: "tw", url: clean(m) };

    m = txt.match(VD);
    if (m) return { type: "vd", url: clean(m) };

    m = txt.match(TH);
    if (m) return { type: "th", url: clean(m) };

    m = txt.match(MG);
    if (m) return { type: "mg", url: clean(m) };

    m = txt.match(SC);
    if (m) return { type: "sc", url: clean(m) };

    m = txt.match(SP);
    if (m) return { type: "sp", url: clean(m) };

    m = txt.match(YT);
    if (m) return { type: "yt", url: clean(m) };

    m = txt.match(SF);
    if (m) return { type: "sf", url: clean(m) };

    m = txt.match(MF);
    if (m) return { type: "mf", url: clean(m) };

    return null;
};

/**
 * Download TikTok
 */
export const tt = async (url) => {
    const res = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`);
    const d = await res.json();

    if (d.code !== 0 || !d.data) throw new Error(d.msg || 'TikTok API error');

    const r = d.data.images?.length
        ? { type: "image", data: d.data.images }
        : { type: "video", data: d.data.play };

    return { type: r.type, data: r.data };
};

/**
 * Download Instagram
 */
export const ig = async (url) => {
    const res = await fetch(`https://api-faa.my.id/faa/igdl?url=${encodeURIComponent(url)}`);
    const d = await res.json();

    if (!d.status || !d.result || !d.result.url) throw new Error(d.message || 'Instagram API error');

    return d.result.url;
};

/**
 * Download Pinterest
 */
export const pin = async (url) => {
    const res = await fetch(`https://api-faa.my.id/faa/pin-down?url=${encodeURIComponent(url)}`);
    const d = await res.json();

    if (!d.status || !d.result || !d.result.medias) throw new Error(d.message || 'Pinterest API error');

    return d.result.medias;
};

/**
 * Download Facebook
 */
export const fb = async (url) => {
    const res = await fetch(`https://api-faa.my.id/faa/fbdownload?url=${encodeURIComponent(url)}`);
    const d = await res.json();

    if (!d.status || !d.result || !d.result.media) throw new Error(d.message || 'Facebook API error');

    return d.result.media;
};

/**
 * Download Twitter/X
 */
export const tw = async (url) => {
    const res = await fetch(`https://api.nexray.web.id/downloader/twitter?url=${encodeURIComponent(url)}`);
    const d = await res.json();

    if (!d.status || !d.result) throw new Error(d.message || 'Twitter/X API error');

    return { type: d.result.type, data: d.result.download_url };
};

/**
 * Download Videy
 */
export const vd = async (url) => {
    const res = await fetch(`https://api.nexray.web.id/downloader/videy?url=${encodeURIComponent(url)}`);
    const d = await res.json();

    if (!d.status || !d.result) throw new Error(d.message || 'Videy API error');

    return d.result;
};

/**
 * Download MediaFire
 */
export const mf = async (url) => {
    const res = await fetch(`https://api-faa.my.id/faa/mediafire?url=${encodeURIComponent(url)}`);
    const d = await res.json();

    if (!d.status || !d.result) throw new Error(d.message || 'MediaFire API error');

    return d.result;
};

/**
 * Download Threads
 */
export const th = async (url) => {
    const res = await fetch(`https://api.nexray.web.id/downloader/threads?url=${encodeURIComponent(url)}`);
    const d = await res.json();

    if (!d.status || !d.result || !d.result.media) throw new Error(d.message || 'Threads API error');

    return d.result.media;
};

/**
 * Download Mega
 */
export const mg = async (url) => {
    const res = await fetch(`https://api.nexray.web.id/downloader/mega?url=${encodeURIComponent(url)}`);
    const d = await res.json();

    if (!d.status || !d.result) throw new Error(d.message || 'Mega API error');

    return d.result;
};

/**
 * Download SoundCloud
 */
export const sc = async (url) => {
    const res = await fetch(`https://api.nexray.web.id/downloader/soundcloud?url=${encodeURIComponent(url)}`);
    const d = await res.json();

    if (!d.status || !d.result || !d.result.url) throw new Error(d.message || 'SoundCloud API error');

    return d.result;
};

/**
 * Download Spotify
 */
export const sp = async (url) => {
    const res = await fetch(`https://api.nexray.web.id/downloader/spotify?url=${encodeURIComponent(url)}`);
    const d = await res.json();

    if (!d.status || !d.result || !d.result.url) throw new Error(d.message || 'Spotify API error');

    return d.result;
};

/**
 * Download YouTube MP3
 */
export const yt = async (url) => {
    const res = await fetch(`https://api.nexray.web.id/downloader/ytmp3?url=${encodeURIComponent(url)}`);
    const d = await res.json();

    if (!d.status || !d.result || !d.result.url) throw new Error(d.message || 'YouTube API error');

    return d.result;
};

/**
 * Download Sfile
 */
export const sf = async (url) => {
    const res = await fetch(`https://api.nexray.web.id/downloader/sfile?url=${encodeURIComponent(url)}`);
    const d = await res.json();

    if (!d.status || !d.result || !d.result.url) throw new Error(d.message || 'Sfile API error');

    return d.result;
};