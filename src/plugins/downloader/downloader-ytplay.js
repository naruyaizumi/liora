/**
 * @file YouTube downloader and search
 * @module plugins/downloader/play
 * @license Apache-2.0
 * @author Naruya Izumi
 */

const YT_REGEX = /^(https?:\/\/)?((www|m|music)\.)?(youtube(-nocookie)?\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(\S+)?$/i;

const extractUrl = (text) => {
    if (!text) return null;
    const match = text.match(YT_REGEX);
    return match ? match[0] : null;
};

let handler = async (m, { sock, args, usedPrefix, command }) => {
    let raw = args.join(" ").trim();

    if (!raw && m.quoted?.text) {
        raw = m.quoted.text.trim();
    }

    if (!raw) {
        return m.reply(
            `*YouTube Downloader*\n\n` +
            `*Usage:*\n` +
            `│ • ${usedPrefix + command} <query> - Search & play audio\n` +
            `│ • ${usedPrefix + command} <url> - Convert to MP3\n` +
            `│ • ${usedPrefix + command} v <url> - Download as MP4\n` +
            `│ • ${usedPrefix + command} s <query> - Search videos\n\n` +
            `*Note:* Supports reply to YouTube link`
        );
    }

    if (m.quoted?.text) {
        const qUrl = extractUrl(m.quoted.text);
        if (qUrl && !extractUrl(raw)) {
            if (/^v$/i.test(raw)) {
                raw = `v ${qUrl}`;
            } else if (!raw.match(/^[vs]\s/i)) {
                raw = qUrl;
            }
        }
    }

    await global.loading(m, sock);

    try {
        // .play v <url> → download MP4 (pake API ytmp4)
        if (/^v\s+/i.test(raw)) {
            const url = raw.replace(/^v\s+/i, '').trim();
            const ytUrl = extractUrl(url);
            if (!ytUrl) return m.reply("Invalid YouTube URL");
            
            const apiUrl = `https://api-faa.my.id/faa/ytmp4?url=${encodeURIComponent(ytUrl)}`;
            const res = await fetch(apiUrl);
            const data = await res.json();
            
            if (!data.status || !data.result) {
                throw new Error(data.message || 'API error');
            }
            
            await sock.sendMessage(m.chat, {
                video: { url: data.result.download_url },
                mimetype: "video/mp4",
            }, { quoted: m });
        }
        // .play s <query> → search
        else if (/^s\s+/i.test(raw)) {
            const query = raw.replace(/^s\s+/i, '').trim();
            if (!query) return m.reply(`Usage: ${usedPrefix + command} s <query>`);
            
            const apiUrl = `https://api-faa.my.id/faa/youtube?q=${encodeURIComponent(query)}`;
            const res = await fetch(apiUrl);
            const data = await res.json();
            
            if (!data.status || !data.result || data.result.length === 0) {
                return m.reply(`No results for "${query}"`);
            }
            
            const vids = data.result;
            const rows = vids.map((v, i) => ({
                header: `Result ${i + 1}`,
                title: v.title,
                description: `${v.channel || "-"} • ${v.duration || "-"}`,
                id: `.play ${v.link}`,
            }));
            
            await sock.client(m.chat, {
                image: { url: vids[0]?.imageUrl },
                caption: `*YouTube Search Results*\n\n*Select a video below*\n\n*Query:* ${query}\n*Found:* ${vids.length} results`,
                footer: `Search results for "${query}"`,
                interactiveButtons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "Select Video",
                        sections: [{
                            title: `Results (${vids.length})`,
                            rows,
                        }],
                    }),
                }],
            }, { quoted: m });
        }
        // .play <url> → MP3
        else if (extractUrl(raw)) {
            const ytUrl = extractUrl(raw);
            const apiUrl = `https://api-faa.my.id/faa/ytmp3?url=${encodeURIComponent(ytUrl)}`;
            
            const res = await fetch(apiUrl);
            const data = await res.json();
            
            if (!data.status || !data.result) {
                throw new Error(data.message || 'API error');
            }
            
            const { title, thumbnail, mp3 } = data.result;
            
            await sock.sendMessage(m.chat, {
                audio: { url: mp3 },
                mimetype: "audio/mpeg",
                contextInfo: {
                    externalAdReply: {
                        title: title || 'YouTube Audio',
                        body: 'Downloaded via API',
                        thumbnailUrl: thumbnail,
                        mediaUrl: ytUrl,
                        mediaType: 2,
                        renderLargerThumbnail: true,
                    },
                },
            }, { quoted: m });
        }
        // .play <query> → search & play audio
        else {
            const query = encodeURIComponent(raw);
            const apiUrl = `https://api-faa.my.id/faa/ytplay?query=${query}`;
            
            const res = await fetch(apiUrl);
            const data = await res.json();
            
            if (!data.status || !data.result) {
                throw new Error(data.message || 'API error');
            }
            
            const { title, author, thumbnail, url, mp3 } = data.result;
            
            await sock.sendMessage(m.chat, {
                audio: { url: mp3 },
                mimetype: "audio/mpeg",
                contextInfo: {
                    externalAdReply: {
                        title: title || 'YouTube Audio',
                        body: author || 'Unknown',
                        thumbnailUrl: thumbnail,
                        mediaUrl: url,
                        mediaType: 2,
                        renderLargerThumbnail: true,
                    },
                },
            }, { quoted: m });
        }
    } catch (e) {
        global.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, sock, true);
    }
};

handler.help = ["play"];
handler.tags = ["downloader"];
handler.command = /^(play|p)$/i;

export default handler;