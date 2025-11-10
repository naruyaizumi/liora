export async function ytmp3(url) {
    const encoded = encodeURIComponent(url.trim());
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encoded}`,
        `https://api.ootaizumi.web.id/downloader/youtube?url=${encoded}&format=mp3`,
        `https://api.elrayyxml.web.id/api/downloader/ytmp3?url=${encoded}`,
    ];

    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        const json = await Bun.readableStreamToJSON(res.body).catch(() => null);
        if (!json || (!json.success && !json.status)) continue;

        const downloadUrl = json.result?.downloadUrl || json.result?.download || json.result?.url;

        if (downloadUrl) {
            return {
                success: true,
                downloadUrl,
            };
        }
    }

    return { success: false, error: "Failed to retrieve audio from the provided link." };
}
