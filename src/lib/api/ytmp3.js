/**
 * @file YouTube to MP3 converter utility
 * @module downloader/ytmp3
 * @description Multi-endpoint YouTube to MP3 converter for extracting
 * audio from YouTube videos with fallback strategy.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Converts YouTube video to MP3 audio format
 * @async
 * @function ytmp3
 * @param {string} url - YouTube video URL to convert
 * @returns {Promise<Object>} Conversion result with MP3 download URL
 *
 * @returns
 * - Success: { success: true, downloadUrl: string }
 * - Failure: { success: false, error: string }
 *
 * @features
 * 1. Multi-endpoint fallback for maximum reliability
 * 2. Direct MP3 conversion without intermediate downloads
 * 3. Support for various YouTube URL formats
 * 4. Audio quality preservation (typically 128-320kbps)
 *
 * @supportedInputs
 * - Standard YouTube URLs: https://youtube.com/watch?v={id}
 * - Shortened URLs: https://youtu.be/{id}
 * - YouTube Music URLs: https://music.youtube.com/watch?v={id}
 * - YouTube Shorts URLs: https://youtube.com/shorts/{id}
 * - YouTube live streams and premieres
 *
 * @limitations
 * - Video length limits may apply (typically <2 hours)
 * - Some services may add watermarks to free conversions
 * - Audio quality may be reduced for longer videos
 * - Copyright-protected content may be blocked
 */
export async function ytmp3(url) {
    const encoded = encodeURIComponent(url);

    /**
     * API endpoints for YouTube to MP3 conversion with priority order
     * @private
     * @constant {Array<string>}
     */
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encoded}`, // Primary: Nekolabs
        `https://api.ootaizumi.web.id/downloader/youtube?url=${encoded}&format=mp3`, // Secondary: Ootaizumi with MP3 format
        `https://api.elrayyxml.web.id/api/downloader/ytmp3?url=${encoded}`, // Tertiary: Elrayy MP3-specific
    ];

    /**
     * Attempt each conversion endpoint until successful or all fail
     * @private
     * @loop
     */
    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        const json = await res.json().catch(() => null);
        if (!json || (!json.success && !json.status)) continue;

        /**
         * Extract MP3 download URL from various API response formats
         * @private
         * @variable {string|undefined}
         */
        const downloadUrl =
            json.result?.downloadUrl || // Nekolabs format
            json.result?.download || // Ootaizumi format
            json.result?.url; // Simple URL format

        if (downloadUrl) {
            return {
                success: true,
                downloadUrl: downloadUrl,
            };
        }
    }

    /**
     * All endpoints failed to convert the YouTube video to MP3
     * @return {Object} Failure response with error message
     */
    return {
        success: false,
        error: "Failed to retrieve audio from the provided YouTube link. The video may be private, age-restricted, too long, or contain copyright-protected content.",
    };
}
