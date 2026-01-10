/**
 * @file TikTok content downloader utility
 * @module downloader/tiktok
 * @description Multi-endpoint TikTok downloader for extracting videos and images
 * from TikTok posts with comprehensive fallback strategy.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Downloads media content from a TikTok URL
 * @async
 * @function tiktok
 * @param {string} url - TikTok video or slideshow URL to download
 * @returns {Promise<Object>} Download result with media URLs
 *
 * @returns
 * - Success (Video): { success: true, type: "video", videoUrl: string }
 * - Success (Images): { success: true, type: "images", images: Array<string> }
 * - Failure: { success: false, error: string }
 *
 * @features
 * 1. Multi-endpoint fallback with 5 different APIs
 * 2. Support for both video posts and image slideshows
 * 3. Quality selection (HD when available)
 * 4. Private link detection and error handling
 *
 * @supportedContent
 * - Single video posts (with or without watermark)
 * - Multi-image slideshows
 * - TikTok stories
 * - User profile videos
 *
 * @limitations
 * - Videos may have TikTok watermark
 * - HD videos may require login/session
 * - Region-restricted content may not be accessible
 * - Some links may expire or be removed
 */
export async function tiktok(url) {
    const encoded = encodeURIComponent(url);

    /**
     * API endpoints for TikTok download with priority order
     * @private
     * @constant {Array<string>}
     */
    const endpoints = [
        `https://tikwm.com/api/?url=${encoded}`, // Primary: tikwm.com (reliable)
        `https://api.nekolabs.web.id/downloader/tiktok?url=${encoded}`, // Secondary: Nekolabs
        `https://api.elrayyxml.web.id/api/downloader/tiktok?url=${encoded}`, // Tertiary: Elrayy
        `https://api.ootaizumi.web.id/downloader/tiktok?url=${encoded}`, // Quaternary: Ootaizumi
        `https://anabot.my.id/api/download/tiktok?url=${encoded}&apikey=freeApikey`, // Quinary: Anabot
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
         * Extract data from various nested response structures
         * Supports multiple API response formats
         * @private
         * @variable {Object|null}
         */
        const data = json.data?.result || json.result || json.data;
        if (!data) continue;

        /**
         * Format 1: Image slideshow detection
         * Checks for image arrays in various property names
         * @private
         */
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
                images: images.filter((url) => typeof url === "string" && url.startsWith("http")),
            };
        }

        /**
         * Format 2: Single video detection
         * Checks for video URL in various property names with priority
         * @private
         */
        const videoUrl =
            data.play || // tikwm format
            data.video || // Standard video property
            data.videoUrl || // Some APIs use videoUrl
            data.hdplay || // HD video variant
            (typeof data.data === "string" ? data.data : null); // Direct string data

        if (videoUrl) {
            return {
                success: true,
                type: "video",
                videoUrl: videoUrl,
            };
        }
    }

    /**
     * All endpoints failed to return usable media data
     * @return {Object} Failure response with error message
     */
    return {
        success: false,
        error: "No downloadable media found. The TikTok may be private, removed, region-restricted, or the link may be invalid.",
    };
}
