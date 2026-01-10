/**
 * @file Instagram content downloader utility
 * @module downloader/instagram
 * @description Multi-endpoint Instagram downloader with fallback strategy
 * and content type detection for videos and images.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Downloads Instagram content from a given URL using multiple API endpoints
 * @async
 * @function instagram
 * @param {string} url - Instagram post URL to download
 * @returns {Promise<Object>} Download result object
 *
 * @returns
 * - Success: { success: true, type: 'video'|'images', urls: Array<string> }
 * - Failure: { success: false, error: string }
 *
 * @strategy
 * 1. Try multiple API endpoints sequentially
 * 2. Parse various response formats from different services
 * 3. Detect content type (video/images) and extract URLs
 * 4. Return deduplicated URLs for multi-image posts
 *
 * @supportedFormats
 * - Single videos
 * - Image carousels (multiple images)
 * - Stories and reels
 * - IGTV videos
 */
export async function instagram(url) {
    const encoded = encodeURIComponent(url);

    /**
     * List of backup API endpoints with priority order
     * @private
     * @constant {Array<string>}
     */
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/instagram?url=${encoded}`,
        `https://api.elrayyxml.web.id/api/downloader/instagram?url=${encoded}`,
        `https://api.zenzxz.my.id/api/downloader/instagram?url=${encoded}`,
        `https://anabot.my.id/api/download/instagram?url=${encoded}&apikey=freeApikey`,
        `https://api.ootaizumi.web.id/downloader/instagram?url=${encoded}`,
    ];

    /**
     * Attempts each endpoint until successful or all fail
     * @private
     * @loop
     */
    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        const json = await res.json().catch(() => null);
        if (!json || (!json.success && !json.status)) continue;

        /**
         * Extract raw media data from various API response formats
         * @private
         * @variable {*}
         */
        const raw =
            json.result ||
            json.data?.result ||
            json.data ||
            json.result?.media ||
            json.result?.media?.media;

        /**
         * Format 1: Direct video URL with isVideo flag
         * @example { result: { media: "https://...", isVideo: true } }
         */
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

        /**
         * Format 2: Image array with isVideo flag
         * @example { result: { media: ["https://...", ...], isVideo: false } }
         */
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

        /**
         * Format 3: Array of objects (Zenzxz API format)
         * @example [{ videoUrl: "..." }, { imageUrl: "..." }]
         */
        if (Array.isArray(raw)) {
            const formatZenz = raw.every(
                (item) => typeof item === "object" && ("videoUrl" in item || "imageUrl" in item)
            );

            if (formatZenz) {
                const videoItems = raw.filter((item) => item.videoUrl);
                const imageItems = raw.filter((item) => item.imageUrl);

                // Single video case
                if (videoItems.length === 1 && imageItems.length === 0) {
                    return {
                        success: true,
                        type: "video",
                        urls: [videoItems[0].videoUrl],
                    };
                }

                // Multiple images case
                if (imageItems.length > 0) {
                    const uniqueImages = [...new Set(imageItems.map((item) => item.imageUrl))];
                    return {
                        success: true,
                        type: "images",
                        urls: uniqueImages,
                    };
                }

                // If no valid items, try next endpoint
                continue;
            }

            /**
             * Format 4: Generic array format with url property
             * @example [{ url: "https://..." }, ...]
             */
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

        /**
         * Format 5: Direct URL in nested properties
         * @example { result: { url: "https://..." } }
         * @example { result: { downloadUrl: "https://..." } }
         */
        const fallbackUrl = raw?.url || raw?.downloadUrl;
        if (fallbackUrl) {
            return {
                success: true,
                type: "video",
                urls: [fallbackUrl],
            };
        }
    }

    /**
     * All endpoints failed to return usable data
     * @return {Object} Failure response
     */
    return {
        success: false,
        error: "No downloadable media found. The post may be private, removed, or in an unsupported format.",
    };
}
