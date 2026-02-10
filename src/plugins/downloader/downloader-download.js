/**
 * @file Universal downloader handler
 * @module plugins/downloader/download
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { ext, tt, ig, pin, fb, tw, vd, mf, th, mg, sc, sp, yt,
    sf } from "#lib/downloader.js";

let handler = async (m, { sock, args, usedPrefix, command }) => {
    let raw = args.join(" ").trim();
    
    if (!raw && m.quoted?.text) {
        raw = m.quoted.text;
    }
    
    const cmd = usedPrefix + command;
    
    if (!raw) return m.reply(`*Universal Downloader*

*Supported Platforms:*
TikTok • Instagram • Pinterest • Facebook
Twitter/X • Threads • Videy • Mega
SoundCloud • Spotify • YouTube • Sfile
MediaFire

*Usage:* ${usedPrefix + command} <url>
*Note:* Reply to a link also works`);
    
    const url = ext(raw);
    if (!url) {
        return m.reply(
            "Invalid URL. Please provide a valid link from supported platforms."
            );
    }
    
    await global.loading(m, sock);
    
    try {
        switch (url.type) {
            case "tt": {
                const r = await tt(url.url);
                
                if (r.type === "video") {
                    await sock.sendMessage(m.chat, {
                        video: { url: r.data },
                        mimetype: "video/mp4"
                    }, { quoted: m });
                } else if (r.type === "image") {
                    if (!r.data || r.data.length === 0) throw new Error(
                        "No image data found");
                    
                    if (r.data.length === 1) {
                        await sock.sendMessage(m.chat, { image: { url: r
                                    .data[0] } }, { quoted: m });
                    } else {
                        const alb = {
                            album: r.data.map((img, i) => ({
                                image: { url: img },
                                caption: `${i + 1}/${r.data.length}`,
                            })),
                        };
                        await sock.client(m.chat, alb, { quoted: m });
                    }
                }
                break;
            }
            
            case "ig": {
                const urls = await ig(url.url);
                
                if (!urls || urls.length === 0) throw new Error(
                    "No media found");
                
                if (urls.length === 1) {
                    const isv = urls[0].match(/\.(mp4|mov|avi|mkv)$/i);
                    if (isv) {
                        await sock.sendMessage(m
                        .chat, { video: { url: urls[0] },
                            mimetype: "video/mp4" }, { quoted: m });
                    } else {
                        await sock.sendMessage(m
                        .chat, { image: { url: urls[
                                    0] } }, { quoted: m });
                    }
                } else {
                    const alb = {
                        album: urls.map((img, i) => ({
                            image: { url: img },
                            caption: `${i + 1}/${urls.length}`,
                        })),
                    };
                    await sock.client(m.chat, alb, { quoted: m });
                }
                break;
            }
            
            case "pin": {
                const meds = await pin(url.url);
                
                if (!meds || meds.length === 0) throw new Error(
                    "No media found");
                
                const imgs = meds.filter(m => m.type === 'image');
                
                if (imgs.length > 0) {
                    if (imgs.length === 1) {
                        await sock.sendMessage(m
                        .chat, { image: { url: imgs[0]
                                    .url } }, { quoted: m });
                    } else {
                        const alb = {
                            album: imgs.map((img, i) => ({
                                image: { url: img.url },
                                caption: `${i + 1}/${imgs.length}`,
                            })),
                        };
                        await sock.client(m.chat, alb, { quoted: m });
                    }
                } else {
                    const vid = meds.find(m => m.type === 'video');
                    const gif = meds.find(m => m.type === 'gif');
                    
                    if (vid) {
                        await sock.sendMessage(m
                        .chat, { video: { url: vid.url },
                            mimetype: "video/mp4" }, { quoted: m });
                    } else if (gif) {
                        await sock.sendMessage(m
                        .chat, { video: { url: gif.url },
                            gifPlayback: true }, { quoted: m });
                    }
                }
                break;
            }
            
            case "fb": {
                const med = await fb(url.url);
                
                if (med.video_hd || med.video_sd) {
                    const vu = med.video_hd || med.video_sd;
                    await sock.sendMessage(m.chat, { video: { url: vu },
                        mimetype: "video/mp4" }, { quoted: m });
                } else if (med.photo_image) {
                    await sock.sendMessage(m.chat, { image: { url: med
                                .photo_image } }, { quoted: m });
                } else {
                    throw new Error(
                        "No downloadable media found in this Facebook post"
                        );
                }
                break;
            }
            
            case "tw": {
                const r = await tw(url.url);
                
                if (r.type === "image") {
                    if (!r.data || r.data.length === 0) throw new Error(
                        "No image data found");
                    
                    if (r.data.length === 1) {
                        await sock.sendMessage(m.chat, { image: { url: r
                                    .data[0]
                                    .url } }, { quoted: m });
                    } else {
                        const alb = {
                            album: r.data.map((img, i) => ({
                                image: { url: img.url },
                                caption: `${i + 1}/${r.data.length}`,
                            })),
                        };
                        await sock.client(m.chat, alb, { quoted: m });
                    }
                } else if (r.type === "video") {
                    if (!r.data || r.data.length === 0) throw new Error(
                        "No video data found");
                    
                    const vqs = r.data.filter(item => item.type ===
                        "mp4");
                    let best = null;
                    
                    if (vqs.length > 0) {
                        best = vqs.find(v => v.resolusi === "768p") ||
                            vqs.find(v => v.resolusi === "640p") ||
                            vqs.find(v => v.resolusi === "426p") ||
                            vqs[0];
                    }
                    
                    if (best) {
                        await sock.sendMessage(m
                        .chat, { video: { url: best.url },
                            mimetype: "video/mp4" }, { quoted: m });
                    } else {
                        throw new Error("No video URL found");
                    }
                }
                break;
            }
            
            case "vd": {
                const vu = await vd(url.url);
                await sock.sendMessage(m.chat, { video: { url: vu },
                    mimetype: "video/mp4" }, { quoted: m });
                break;
            }
            
            case "mf": {
                const r = await mf(url.url);
                
                await sock.sendMessage(m.chat, {
                    document: { url: r.download_url },
                    fileName: r.filename,
                    mimetype: r.mime ? `application/${r.mime}` :
                        'application/octet-stream',
                    caption: `*MediaFire Download*\n\n` +
                        `📄 *Filename:* ${r.filename}\n` +
                        `📦 *Size:* ${r.size}`
                }, { quoted: m });
                break;
            }
            
            case "th": {
                const meds = await th(url.url);
                
                if (!meds || meds.length === 0) throw new Error(
                    "No media found");
                
                const vids = meds.filter(m => m.thumbnail && m
                    .thumbnail !== "-");
                const imgs = meds.filter(m => !m.thumbnail || m
                    .thumbnail === "-");
                
                if (vids.length > 0) {
                    const vid = vids[0];
                    await sock.sendMessage(m.chat, { video: { url: vid
                                .url },
                    mimetype: "video/mp4" }, { quoted: m });
                } else if (imgs.length > 0) {
                    if (imgs.length === 1) {
                        await sock.sendMessage(m
                        .chat, { image: { url: imgs[0]
                                    .url } }, { quoted: m });
                    } else {
                        const alb = {
                            album: imgs.map((img, i) => ({
                                image: { url: img.url },
                                caption: `${i + 1}/${imgs.length}`,
                            })),
                        };
                        await sock.client(m.chat, alb, { quoted: m });
                    }
                }
                break;
            }
            
            case "mg": {
                const r = await mg(url.url);
                
                const durl = Array.isArray(r.download_url) ? r
                    .download_url[0] : r.download_url;
                
                await sock.sendMessage(m.chat, {
                    document: { url: durl },
                    fileName: r.filename,
                    mimetype: r.mimetype ||
                        'application/octet-stream',
                    caption: `*Mega Download*\n\n` +
                        `📄 *Filename:* ${r.filename}\n` +
                        `📦 *Size:* ${r.filesize}`
                }, { quoted: m });
                break;
            }
            
            case "sc": {
                const r = await sc(url.url);
                
                await sock.sendMessage(m.chat, {
                    audio: { url: r.url },
                    mimetype: "audio/mpeg",
                    fileName: r.fileName,
                }, { quoted: m });
                break;
            }
            
            case "sp": {
                const r = await sp(url.url);
                
                await sock.sendMessage(m.chat, {
                    audio: { url: r.url },
                    mimetype: "audio/mpeg",
                    fileName: `${r.title} - ${r.artist}.mp3`,
                }, { quoted: m });
                break;
            }
            
            case "yt": {
                const r = await yt(url.url);
                
                await sock.sendMessage(m.chat, {
                    audio: { url: r.url },
                    mimetype: "audio/mpeg",
                    fileName: `${r.title}.mp3`,
                }, { quoted: m });
                break;
            }
            
            case "sf": {
                const r = await sf(url.url);
                
                await sock.sendMessage(m.chat, {
                    document: { url: r.url },
                    fileName: r.file_name,
                    mimetype: r.mimetype === '7ZIP' ?
                        'application/x-7z-compressed' :
                        'application/octet-stream',
                    caption: `*Sfile Download*\n\n` +
                        `📄 *Filename:* ${r.file_name}\n` +
                        `📦 *Size:* ${r.size}`
                }, { quoted: m });
                break;
            }
        }
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, sock, true);
    }
};

handler.help = ["download"];
handler.tags = ["downloader"];
handler.command = /^(download|dl)$/i;

export default handler;