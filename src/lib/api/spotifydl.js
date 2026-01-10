/**
 * @file Spotify direct link downloader utility
 * @module downloader/spotifydl
 * @description Direct Spotify URL downloader for extracting audio from
 * Spotify track, playlist, or album links with multiple endpoint fallback.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Downloads audio directly from a Spotify URL
 * @async
 * @function spotifydl
 * @param {string} url - Spotify track/playlist/album URL
 * @returns {Promise<Object>} Download result with direct audio URL
 *
 * @returns
 * - Success: { success: true, downloadUrl: string }
 * - Failure: { success: false, error: string }
 *
 * @features
 * 1. Direct Spotify URL processing (no search required)
 * 2. Multi-endpoint fallback for maximum reliability
 * 3. Extract direct audio download links from various API formats
 * 4. Support for Spotify track, playlist, and album URLs
 *
 * @supportedInputs
 * - Track URLs: https://open.spotify.com/track/{id}
 * - Playlist URLs: https://open.spotify.com/playlist/{id}
 * - Album URLs: https://open.spotify.com/album/{id}
 * - Spotify URIs: spotify:track:{id}
 *
 * @limitations
 * - Most services convert Spotify to YouTube audio (quality varies)
 * - Playlist/album downloads may only return first track
 * - Some tracks may be unavailable due to licensing restrictions
 * - Download URLs may have limited lifetime (temporary links)
 */
export async function spotifydl(url) {
    const encoded = encodeURIComponent(url);

    /**
     * API endpoints for Spotify direct URL download with priority order
     * @private
     * @constant {Array<string>}
     */
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/spotify/v1?url=${encoded}`,
        `https://api.ootaizumi.web.id/downloader/spotify?url=${encoded}`,
        `https://api.elrayyxml.web.id/api/downloader/spotify?url=${encoded}`,
        `https://api.rikishop.my.id/download/spotify?url=${encoded}`,
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
         * Extract download URL from various API response formats
         * Supports multiple nested structures from different services
         * @private
         * @variable {string|undefined}
         */
        const downloadUrl =
            json.result?.downloadUrl || // Nekolabs format
            json.result?.download || // Ootaizumi format
            json.result?.url || // Simple URL format
            json.result?.res_data?.formats?.[0]?.url; // Rikishop format with quality selection

        if (downloadUrl) {
            return {
                success: true,
                downloadUrl: downloadUrl,
            };
        }
    }

    /**
     * All endpoints failed to return a usable download URL
     * @return {Object} Failure response with error message
     */
    return {
        success: false,
        error: "Failed to retrieve audio from the provided Spotify link. The track may be unavailable, region-restricted, or the link may be invalid.",
    };
}
