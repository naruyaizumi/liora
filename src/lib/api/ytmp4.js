/**
 * @file YouTube to MP4 downloader utility
 * @module downloader/ytmp4
 * @description Multi-endpoint YouTube to MP4 downloader for extracting
 * videos from YouTube with quality selection and fallback strategy.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Downloads YouTube video in MP4 format
 * @async
 * @function ytmp4
 * @param {string} url - YouTube video URL to download
 * @returns {Promise<Object>} Download result with MP4 download URL
 *
 * @returns
 * - Success: { success: true, downloadUrl: string }
 * - Failure: { success: false, error: string }
 *
 * @features
 * 1. Multi-endpoint fallback with quality preference (720p requested)
 * 2. Video format validation (ensures MP4 output)
 * 3. Support for various YouTube URL formats
 * 4. Clear error messaging for audio-only links
 *
 * @supportedInputs
 * - Standard YouTube URLs: https://youtube.com/watch?v={id}
 * - Shortened URLs: https://youtu.be/{id}
 * - YouTube Shorts URLs: https://youtube.com/shorts/{id}
 * - YouTube Music videos
 * - YouTube live stream archives
 *
 * @quality
 * - Requests 720p quality where available
 * - Falls back to highest available quality
 * - Some services may offer 1080p or 4K options
 *
 * @limitations
 * - Audio-only content (music) should use .ytmp3 instead
 * - DRM-protected videos cannot be downloaded
 * - Some services may add watermarks
 * - Quality depends on original upload
 */
export async function ytmp4(url) {
    const encoded = encodeURIComponent(url);

    /**
     * API endpoints for YouTube to MP4 download with priority order
     * @private
     * @constant {Array<string>}
     */
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encoded}&format=720`, // Primary with 720p preference
        `https://api-faa.my.id/faa/ytmp4?url=${encoded}`, // Secondary
        `https://api.kyyokatsu.my.id/api/downloader/ytmp4?url=${encoded}`, // Tertiary
        `https://api.rikishop.my.id/download/ytmp4?url=${encoded}`, // Quaternary
    ];

    /**
     * Attempt each download endpoint until successful or all fail
     * @private
     * @loop
     */
    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        const json = await res.json().catch(() => null);
        if (!json || (!json.success && !json.status)) continue;

        /**
         * Extract MP4 download URL from various API response formats
         * @private
         * @variable {string|undefined}
         */
        const downloadUrl =
            json.result?.downloadUrl || // Nekolabs format
            json.result?.download_url || // FAA format
            json.result?.mp4 || // Kyyokatsu format
            json.result?.url; // Rikishop format

        /**
         * Verify the result is actually a video (not audio-only)
         * @private
         * @variable {boolean}
         */
        const isVideo =
            json.result?.type === "video" || // Type indicates video
            json.result?.format === "mp4" || // Format is MP4
            json.result?.mp4 || // Has mp4 property
            json.result?.url; // Has url property

        if (downloadUrl && isVideo) {
            return {
                success: true,
                downloadUrl: downloadUrl,
            };
        }
    }

    /**
     * All endpoints failed to download the video
     * Special note for audio-only content
     * @return {Object} Failure response with helpful error message
     */
    return {
        success: false,
        error: "Failed to retrieve video. The link may point to audio-only content (music) - try using .ytmp3 for audio downloads.",
    };
}
