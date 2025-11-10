export async function instagram(url) {
    const encoded = encodeURIComponent(url);
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/instagram?url=${encoded}`,
        `https://api.elrayyxml.web.id/api/downloader/instagram?url=${encoded}`,
        `https://api.zenzxz.my.id/api/downloader/instagram?url=${encoded}`,
        `https://anabot.my.id/api/download/instagram?url=${encoded}&apikey=freeApikey`,
        `https://api.ootaizumi.web.id/downloader/instagram?url=${encoded}`,
    ];

    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        const json = await Bun.readableStreamToJSON(res.body).catch(() => null);
        if (!json || (!json.success && !json.status)) continue;

        const raw =
            json.result ||
            json.data?.result ||
            json.data ||
            json.result?.media ||
            json.result?.media?.media;

        if (
            json.result?.media &&
            typeof json.result.media === "string" &&
            json.result.isVideo === true
        ) {
            return {
                success: true,
                type: "video",
                urls: [json.result.media],
            };
        }

        if (
            json.result?.media &&
            Array.isArray(json.result.media) &&
            json.result.isVideo === false
        ) {
            const uniqueImages = [...new Set(json.result.media)];
            return {
                success: true,
                type: "images",
                urls: uniqueImages,
            };
        }

        if (Array.isArray(raw)) {
            const formatZenz = raw.every(
                (item) => typeof item === "object" && ("videoUrl" in item || "imageUrl" in item)
            );

            if (formatZenz) {
                const videoItems = raw.filter((item) => item.videoUrl);
                const imageItems = raw.filter((item) => item.imageUrl);

                if (videoItems.length === 1 && imageItems.length === 0) {
                    return {
                        success: true,
                        type: "video",
                        urls: [videoItems[0].videoUrl],
                    };
                }

                if (imageItems.length > 0) {
                    const uniqueImages = [...new Set(imageItems.map((item) => item.imageUrl))];
                    return {
                        success: true,
                        type: "images",
                        urls: uniqueImages,
                    };
                }

                continue;
            }

            const urls = raw.map((item) => item.url).filter(Boolean);
            if (urls.length) {
                const uniqueUrls = [...new Set(urls)];
                return {
                    success: true,
                    type: uniqueUrls.length === 1 ? "video" : "images",
                    urls: uniqueUrls,
                };
            }
        }

        const fallbackUrl = raw?.url || raw?.downloadUrl;
        if (fallbackUrl) {
            return {
                success: true,
                type: "video",
                urls: [fallbackUrl],
            };
        }
    }

    return { success: false, error: "No downloadable media found." };
}
