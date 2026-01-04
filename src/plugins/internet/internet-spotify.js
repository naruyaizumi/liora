let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return m.reply(
      `Usage: ${usedPrefix + command} <query>\n› Example: ${usedPrefix + command} for revenge`,
    );
  }

  try {
    await global.loading(m, conn);

    const url = `https://api.nekolabs.web.id/discovery/spotify/search?q=${encodeURIComponent(text)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.result)) {
      throw new Error("Invalid API response");
    }

    const tracks = data.result;

    if (tracks.length === 0) {
      return m.reply(`No results found for "${text}".`);
    }

    const rows = tracks.map((track, index) => ({
      header: `Track ${index + 1}`,
      title: track.title,
      description: `${track.artist} • ${track.duration || "-"}`,
      id: `.spotify ${track.title}`,
    }));

    await conn.sendButton(m.chat, {
      image: tracks[0].cover,
      caption: "*Select a track from the results above*",
      title: "Spotify Search Results",
      footer: `Found ${tracks.length} results for "${text}"`,
      interactiveButtons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "Select Track",
            sections: [
              {
                title: `All Results (${tracks.length})`,
                rows: rows,
              },
            ],
          }),
        },
      ],
      hasMediaAttachment: true,
    });
  } catch (e) {
    global.logger.error(e);
    m.reply(`Error: ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["spsearch"];
handler.tags = ["internet"];
handler.command = /^(spsearch)$/i;

export default handler;
