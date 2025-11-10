export async function spotifydl(url) {
    const encoded = encodeURIComponent(url.trim());
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/spotify/v1?url=${encoded}`,
        `https://api.ootaizumi.web.id/downloader/spotify?url=${encoded}`,
        `https://api.elrayyxml.web.id/api/downloader/spotify?url=${encoded}`,
        `https://api.rikishop.my.id/download/spotify?url=${encoded}`,
    ];

    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        const json = await Bun.readableStreamToJSON(res.body).catch(() => null);
        if (!json || (!json.success && !json.status)) continue;

        const downloadUrl =
            json.result?.downloadUrl ||
            json.result?.download ||
            json.result?.url ||
            json.result?.res_data?.formats?.[0]?.url;

        if (downloadUrl) {
            return {
                success: true,
                downloadUrl,
            };
        }
    }

    return { success: false, error: "Failed to retrieve audio from the provided link." };
}
