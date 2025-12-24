let handler = async (m, { conn, command, usedPrefix }) => {
    const q = m.quoted && m.quoted.mimetype ? m.quoted : m;
    const mime = (q.msg || q).mimetype || "";

    if (!q || typeof q.download !== "function" || !/^(image|video|audio)\//i.test(mime)) {
        return m.reply(
            `Please send or reply to an image, video, or audio file.\nExample: ${usedPrefix}${command} reply to media or ${usedPrefix}${command} send media with caption`
        );
    }

    const buffer = await q.download?.().catch(() => null);
    if (!buffer) return m.reply("Failed to retrieve the media.");

    const type = mime.startsWith("image/")
        ? "image"
        : mime.startsWith("video/")
          ? "video"
          : mime.startsWith("audio/")
            ? "audio"
            : null;

    if (!type) return m.reply("Unsupported media type.");

    const rawText = m.text || "";
    const caption = rawText.replace(new RegExp(`^${usedPrefix}${command}\\s*`, "i"), "").trim();
    const mentionMatches = [...caption.matchAll(/@(\d{5,})/g)];
    const mentionedJid = mentionMatches.map((m) => `${m[1]}@lid`);
    const contextInfo = mentionedJid.length > 0 ? { mentionedJid } : {};
    await conn.sendMessage(m.chat, {
        [type]: buffer,
        mimetype: mime,
        caption,
        contextInfo,
        viewOnce: true,
    });
};

handler.help = ["svo"];
handler.tags = ["tools"];
handler.command = /^(send(view(once)?)?|svo)$/i;

export default handler;
