export async function play(query) {
    const encoded = encodeURIComponent(query.trim());
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/youtube/play/v1?q=${encoded}`,
        `https://api.ootaizumi.web.id/downloader/youtube-play?query=${encoded}`,
        `https://anabot.my.id/api/download/playmusic?query=${encoded}&apikey=freeApikey`,
        `https://api.elrayyxml.web.id/api/downloader/ytplay?q=${encoded}`,
    ];

    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        let json;
        try {
            json = await Bun.readableStreamToJSON(res.body);
        } catch {
            continue;
        }

        if (!json || (!json.success && !json.status)) continue;

        if (json.result?.downloadUrl && json.result?.metadata) {
            const { title, channel, cover, url } = json.result.metadata;
            return {
                success: true,
                title,
                channel,
                cover,
                url,
                downloadUrl: json.result.downloadUrl,
            };
        }

        if (json.result?.download && json.result?.title) {
            return {
                success: true,
                title: json.result.title,
                channel: json.result.author?.name || "Unknown Channel",
                cover: json.result.thumbnail,
                url: json.result.url || null,
                downloadUrl: json.result.download,
            };
        }

        const ana = json.data?.result;
        if (ana?.success && ana?.urls && ana?.metadata) {
            return {
                success: true,
                title: ana.metadata.title,
                channel: ana.metadata.channel,
                cover: ana.metadata.thumbnail,
                url: ana.metadata.webpage_url || null,
                downloadUrl: ana.urls,
            };
        }

        const elray = json.result;
        if (
            elray?.download_url &&
            elray?.title &&
            elray?.channel &&
            elray?.thumbnail &&
            elray?.url
        ) {
            return {
                success: true,
                title: elray.title,
                channel: elray.channel,
                cover: elray.thumbnail,
                url: elray.url,
                downloadUrl: elray.download_url,
            };
        }
    }

    return { success: false, error: "No downloadable track found from any provider." };
}
