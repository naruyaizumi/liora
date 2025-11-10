export async function twitter(url) {
    const encoded = encodeURIComponent(url.trim());
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/twitter?url=${encoded}`,
        `https://api.ootaizumi.web.id/downloader/twitter?url=${encoded}`,
        `https://anabot.my.id/api/download/twitter?url=${encoded}&apikey=freeApikey`,
    ];

    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        const json = await Bun.readableStreamToJSON(res.body).catch(() => null);
        if (!json || (!json.success && !json.status)) continue;

        const raw =
            json.result?.media || // Nekolabs
            json.result || // Ootaizumi
            json.data?.result ||
            []; // AnaBot

        if (!Array.isArray(raw)) continue;

        const photos = raw
            .filter(
                (m) =>
                    m.type === "photo" ||
                    m.type === "image" ||
                    m.quality?.toLowerCase().includes("photo") ||
                    m.quality?.toLowerCase().includes("download photo")
            )
            .map((m) => m.url || m.link)
            .filter(Boolean);

        const video = raw.find(
            (m) =>
                (m.type === "video" || m.quality?.toLowerCase().includes("mp4")) &&
                m.link &&
                m.link.startsWith("http")
        );

        return {
            success: true,
            photos,
            video: video?.link || video?.variants?.at(-1)?.url || null,
        };
    }

    return { success: false, error: "Unable to process this Twitter/X URL." };
}
