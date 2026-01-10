/**
 * @file Twitter/X content downloader utility
 * @module downloader/twitter
 * @description Multi-endpoint downloader for extracting media from Twitter/X posts
 * with support for both images and videos.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Downloads media content from a Twitter/X post URL
 * @async
 * @function twitter
 * @param {string} url - Twitter/X post URL to download
 * @returns {Promise<Object>} Download result with media URLs
 *
 * @returns
 * - Success: {
 *     success: true,
 *     photos: Array<string>,
 *     video: string|null
 *   }
 * - Failure: { success: false, error: string }
 *
 * @features
 * 1. Multi-endpoint fallback for reliability
 * 2. Separate extraction of photos and videos
 * 3. Quality/variant selection for videos
 * 4. Support for multiple image galleries
 *
 * @supportedContent
 * - Single image tweets
 * - Multiple image galleries (up to 4 images)
 * - Video tweets (including GIFs)
 * - Tweets with mixed photo/video content
 * - Twitter Spaces (audio only, may not be supported)
 *
 * @limitations
 * - Private/restricted tweets cannot be downloaded
 * - Videos may have quality limitations without authentication
 * - Some media may be deleted or made private
 * - Rate limits may apply to free API services
 */
export async function twitter(url) {
    const encoded = encodeURIComponent(url);

    /**
     * API endpoints for Twitter/X download with priority order
     * @private
     * @constant {Array<string>}
     */
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/twitter?url=${encoded}`, // Primary: Nekolabs
        `https://api.ootaizumi.web.id/downloader/twitter?url=${encoded}`, // Secondary: Ootaizumi
        `https://anabot.my.id/api/download/twitter?url=${encoded}&apikey=freeApikey`, // Tertiary: Anabot
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
         * Extract raw media data from various response formats
         * Standardizes different API response structures
         * @private
         * @variable {Array}
         */
        const raw =
            json.result?.media ||
            // Nekolabs format: { result: { media: [...] } }
            json.result || // Ootaizumi format: { result: [...] }
            json.data?.result ||
            // Anabot format: { data: { result: [...] } }
            []; // Fallback empty array

        if (!Array.isArray(raw)) continue;

        /**
         * Extract photos from media array
         * Filters for photo/image types and maps to URLs
         * @private
         * @variable {Array<string>}
         */
        const photos = raw
            .filter(
                (m) =>
                    m.type === "photo" || // Standard photo type
                    m.type === "image" || // Alternative image type
                    m.quality?.toLowerCase().includes("photo") ||
                    // Quality indicates photo
                    m.quality?.toLowerCase().includes("download photo") // Downloadable photo
            )
            .map((m) => m.url || m.link) // Extract URL
            .filter(Boolean); // Remove null/undefined

        /**
         * Extract video from media array
         * Finds first video entry and selects best quality variant
         * @private
         * @variable {Object|undefined}
         */
        const video = raw.find(
            (m) =>
                (m.type === "video" || // Standard video type
                    m.quality?.toLowerCase().includes("mp4")) &&
                // MP4 quality indicator
                m.link && // Has direct link
                m.link.startsWith("http") // Valid HTTP URL
        );

        /**
         * Return successful result with extracted media
         * Video selection prioritizes direct link, then highest quality variant
         */
        return {
            success: true,
            photos: photos,
            video:
                video?.link || // Direct video link
                video?.variants?.at(-1)?.url ||
                // Last variant (usually highest quality)
                null, // No video found
        };
    }

    /**
     * All endpoints failed to process the Twitter/X URL
     * @return {Object} Failure response with error message
     */
    return {
        success: false,
        error: "Unable to process this Twitter/X URL. The tweet may be private, deleted, or the media format may not be supported.",
    };
}
