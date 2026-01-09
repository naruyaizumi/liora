let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(`Need query\nEx: ${usedPrefix + command} for revenge`);
    }

    try {
        await global.loading(m, conn);

        const url = `https://api.nekolabs.web.id/discovery/spotify/search?q=${encodeURIComponent(text)}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`API failed: ${res.statusText}`);
        }

        const data = await res.json();

        if (!data.success || !Array.isArray(data.result)) {
            throw new Error("Invalid API response");
        }

        const tracks = data.result;

        if (tracks.length === 0) {
            return m.reply(`No results for "${text}"`);
        }

        const rows = tracks.map((t, i) => ({
            header: `Track ${i + 1}`,
            title: t.title,
            description: `${t.artist} • ${t.duration || "-"}`,
            id: `.spotify ${t.title}`,
        }));

        await conn.sendButton(m.chat, {
            image: tracks[0].cover,
            caption: "*Select track above*",
            title: "Spotify Search",
            footer: `Found ${tracks.length} results`,
            interactiveButtons: [
                {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "Select Track",
                        sections: [
                            {
                                title: `Results (${tracks.length})`,
                                rows: rows,
                            },
                        ],
                    }),
                },
            ],
            hasMediaAttachment: true,
        });
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["spsearch"];
handler.tags = ["internet"];
handler.command = /^(spsearch)$/i;

export default handler;
