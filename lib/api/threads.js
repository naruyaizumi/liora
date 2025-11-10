export async function threads(url) {
    const encoded = encodeURIComponent(url.trim());
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/threads?url=${encoded}`,
        `https://anabot.my.id/api/download/threads?url=${encoded}&apikey=freeApikey`,
        `https://api.deline.web.id/downloader/threads?url=${encoded}`,
    ];

    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        const json = await Bun.readableStreamToJSON(res.body).catch(() => null);
        if (!json || (!json.success && !json.status)) continue;

        if (json.result?.images || json.result?.videos) {
            const extractMedia = (data) => {
                if (!Array.isArray(data)) return [];
                return data
                    .map((group) => {
                        if (Array.isArray(group) && group.length > 0) {
                            const best = group[group.length - 1];
                            return best?.url_cdn || best?.url;
                        }
                        return null;
                    })
                    .filter(Boolean);
            };

            return {
                success: true,
                caption: json.result.text || json.result.caption || "",
                images: extractMedia(json.result.images),
                videos: extractMedia(json.result.videos),
            };
        }

        const ana = json.data?.result;
        if (ana?.image_urls || ana?.video_urls) {
            const images = Array.isArray(ana.image_urls)
                ? ana.image_urls.filter((x) => typeof x === "string" && x.startsWith("http"))
                : [];

            const videos = Array.isArray(ana.video_urls)
                ? ana.video_urls
                      .map((v) => v?.download_url)
                      .filter((x) => typeof x === "string" && x.startsWith("http"))
                : [];

            return {
                success: true,
                caption: "",
                images,
                videos,
            };
        }

        const agas = json.result;
        if (agas?.image || agas?.video) {
            const images = Array.isArray(agas.image)
                ? agas.image.filter((x) => typeof x === "string" && x.startsWith("http"))
                : [];

            const videos = Array.isArray(agas.video)
                ? agas.video
                      .map((v) => v?.download_url)
                      .filter((x) => typeof x === "string" && x.startsWith("http"))
                : [];

            return {
                success: true,
                caption: "",
                images,
                videos,
            };
        }
    }

    return { success: false, error: "No media found from any provider." };
}
