export async function ytmp4(url) {
    const encoded = encodeURIComponent(url.trim());
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encoded}&format=720`,
        `https://api-faa.my.id/faa/ytmp4?url=${encoded}`,
        `https://api.kyyokatsu.my.id/api/downloader/ytmp4?url=${encoded}`,
        `https://api.rikishop.my.id/download/ytmp4?url=${encoded}`,
    ];

    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        const json = await Bun.readableStreamToJSON(res.body).catch(() => null);
        if (!json || (!json.success && !json.status)) continue;

        const downloadUrl =
            json.result?.downloadUrl ||
            json.result?.download_url ||
            json.result?.mp4 ||
            json.result?.url;

        const isVideo =
            json.result?.type === "video" ||
            json.result?.format === "mp4" ||
            json.result?.mp4 ||
            json.result?.url;

        if (downloadUrl && isVideo) {
            return {
                success: true,
                downloadUrl,
            };
        }
    }

    return { success: false, error: "Failed to retrieve video. Use .ytmp3 for audio-only links." };
}
