export async function tiktok(url) {
    const encoded = encodeURIComponent(url);
    const endpoints = [
        `https://tikwm.com/api/?url=${encoded}`,
        `https://api.nekolabs.web.id/downloader/tiktok?url=${encoded}`,
        `https://api.elrayyxml.web.id/api/downloader/tiktok?url=${encoded}`,
        `https://api.ootaizumi.web.id/downloader/tiktok?url=${encoded}`,
        `https://anabot.my.id/api/download/tiktok?url=${encoded}&apikey=freeApikey`,
    ];

    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        const json = await Bun.readableStreamToJSON(res.body).catch(() => null);
        if (!json || (!json.success && !json.status)) continue;

        const data = json.data?.result || json.result || json.data;
        if (!data) continue;

        const images = Array.isArray(data.images)
            ? data.images
            : Array.isArray(data.image)
              ? data.image
              : Array.isArray(data.data)
                ? data.data
                : null;
        if (images?.length) {
            return {
                success: true,
                type: "images",
                images,
            };
        }

        const videoUrl =
            data.play ||
            data.video ||
            data.videoUrl ||
            data.hdplay ||
            (typeof data.data === "string" ? data.data : null);

        if (videoUrl) {
            return {
                success: true,
                type: "video",
                videoUrl,
            };
        }
    }

    return { success: false, error: "No downloadable media found." };
}
