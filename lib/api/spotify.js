export async function spotify(query) {
    const encoded = encodeURIComponent(query.trim());
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/spotify/play/v1?q=${encoded}`,
        `https://api.ootaizumi.web.id/downloader/spotifyplay?query=${encoded}`,
        `https://kyyokatsurestapi.my.id/search/spotify?q=${encoded}`,
    ];

    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        const json = await Bun.readableStreamToJSON(res.body).catch(() => null);
        if (!json || (!json.success && !json.status)) continue;

        if (json.result?.downloadUrl && json.result?.metadata) {
            const { title, artist, cover, url } = json.result.metadata;
            return {
                success: true,
                title,
                channel: artist,
                cover,
                url,
                downloadUrl: json.result.downloadUrl,
            };
        }

        const oota = json.result;
        if (oota?.download && oota?.title && oota?.artists && oota?.image && oota?.external_url) {
            return {
                success: true,
                title: oota.title,
                channel: oota.artists,
                cover: oota.image,
                url: oota.external_url,
                downloadUrl: oota.download,
            };
        }

        const kyy = json.result;
        if (kyy?.audio && kyy?.title && kyy?.artist && kyy?.thumbnail && kyy?.url) {
            return {
                success: true,
                title: kyy.title,
                channel: kyy.artist,
                cover: kyy.thumbnail,
                url: kyy.url,
                downloadUrl: kyy.audio,
            };
        }
    }

    return { success: false, error: "No downloadable track found from any provider." };
}
