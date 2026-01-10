/**
 * @file Threads (Meta) content downloader utility
 * @module downloader/threads
 * @description Multi-endpoint downloader for extracting media from Threads posts
 * with support for images, videos, and captions.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Downloads media content from a Threads (Meta) post URL
 * @async
 * @function threads
 * @param {string} url - Threads post URL to download
 * @returns {Promise<Object>} Download result with media and metadata
 * 
 * @returns
 * - Success: { 
 *     success: true, 
 *     caption: string, 
 *     images: Array<string>, 
 *     videos: Array<string> 
 *   }
 * - Failure: { success: false, error: string }
 * 
 * @features
 * 1. Multi-endpoint fallback for reliability
 * 2. Extraction of both images and videos from Threads posts
 * 3. Caption/text content retrieval
 * 4. Media URL deduplication and quality selection
 * 
 * @supportedContent
 * - Single image posts
 * - Multiple image carousels
 * - Video posts (including multiple videos)
 * - Text posts with media attachments
 * - Posts with mixed image/video content
 * 
 * @limitations
 * - Private/restricted posts cannot be downloaded
 * - Some media may be served via CDN with expiration
 * - Video quality may vary depending on source
 */
export async function threads(url) {
    const encoded = encodeURIComponent(url);
    
    /**
     * API endpoints for Threads download with priority order
     * @private
     * @constant {Array<string>}
     */
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/threads?url=${encoded}`,
        `https://anabot.my.id/api/download/threads?url=${encoded}&apikey=freeApikey`,
        `https://api.deline.web.id/downloader/threads?url=${encoded}`,
    ];

    /**
     * Attempt each endpoint until successful or all fail
     * @private
     * @loop
     */
    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        const json = await res.json().catch(() => null);
        if (!json || (!json.success && !json.status)) continue;

        /**
         * Format 1: Nekolabs API format (structured media arrays)
         * @example {
         *   result: {
         *     images: [[{url_cdn: "..."}, ...], ...],
         *     videos: [[{url_cdn: "..."}, ...], ...],
         *     text: "...",
         *     caption: "..."
         *   }
         * }
         */
        if (json.result?.images || json.result?.videos) {
            /**
             * Extracts media URLs from nested array structure
             * Selects highest quality (last item in each quality array)
             * @private
             * @function extractMedia
             * @param {Array} data - Nested media quality arrays
             * @returns {Array<string>} Array of media URLs
             */
            const extractMedia = (data) => {
                if (!Array.isArray(data)) return [];
                return data
                    .map((group) => {
                        if (Array.isArray(group) && group.length > 0) {
                            // Select highest quality (usually last in array)
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

        /**
         * Format 2: Anabot API format (flat URL arrays)
         * @example {
         *   data: {
         *     result: {
         *       image_urls: ["https://...", ...],
         *       video_urls: [{download_url: "https://..."}, ...]
         *     }
         *   }
         * }
         */
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

        /**
         * Format 3: Deline API format (simple arrays)
         * @example {
         *   result: {
         *     image: ["https://...", ...],
         *     video: [{download_url: "https://..."}, ...]
         *   }
         * }
         */
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

    /**
     * All endpoints failed to return usable media data
     * @return {Object} Failure response with error message
     */
    return { 
        success: false, 
        error: "No media found from any provider. The post may be private, deleted, or in an unsupported format." 
    };
}