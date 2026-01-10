/**
 * @file Spotify track search and download utility
 * @module downloader/spotify
 * @description Multi-endpoint Spotify track downloader with metadata extraction
 * and fallback strategy for audio content from Spotify.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Searches and retrieves Spotify track with metadata and download URL
 * @async
 * @function spotify
 * @param {string} query - Search query (track title, artist, Spotify URL)
 * @returns {Promise<Object>} Track information and download data
 * 
 * @returns
 * - Success: { 
 *     success: true, 
 *     title: string, 
 *     channel: string, 
 *     cover: string, 
 *     url: string, 
 *     duration: number, 
 *     downloadUrl: string 
 *   }
 * - Failure: { success: false, error: string }
 * 
 * @features
 * 1. Multi-endpoint fallback for redundancy
 * 2. Metadata extraction (title, artist, album art, duration)
 * 3. Spotify URL resolution for direct links
 * 4. Audio download URL retrieval (typically YouTube-sourced)
 * 
 * @supportedInputs
 * - Track titles: "Blinding Lights The Weeknd"
 * - Artist + track: "Drake Hotline Bling"
 * - Spotify URLs: "https://open.spotify.com/track/..."
 * - Spotify URIs: "spotify:track:4cOdK2wGLETKBW3PvgPWqT"
 * 
 * @limitations
 * - Spotify tracks are typically downloaded from YouTube equivalents
 * - Audio quality depends on YouTube source availability
 * - Some tracks may be region-restricted or unavailable
 */
export async function spotify(query) {
    const encoded = encodeURIComponent(query);
    
    /**
     * API endpoints for Spotify track search with priority order
     * @private
     * @constant {Array<string>}
     */
    const endpoints = [
        `https://api.ootaizumi.web.id/downloader/spotifyplay?query=${encoded}`,
        `https://api.nekolabs.web.id/dwn/spotify/play/v1?q=${encoded}`,
        `https://kyyokatsurestapi.my.id/search/spotify?q=${encoded}`,
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
         * Format 1: Nekolabs API format (structured metadata)
         * @example {
         *   result: {
         *     downloadUrl: "https://...",
         *     metadata: {
         *       title: "...",
         *       artist: "...",
         *       cover: "...",
         *       url: "...",
         *       duration: 180000
         *     }
         *   }
         * }
         */
        if (json.result?.downloadUrl && json.result?.metadata) {
            const { title, artist, cover, url, duration } = json.result.metadata;
            return {
                success: true,
                title: title || "Unknown Track",
                channel: artist || "Unknown Artist",
                cover: cover || null,
                url: url || null,
                duration: duration || 0,
                downloadUrl: json.result.downloadUrl,
            };
        }

        /**
         * Format 2: Ootaizumi API format (flattened structure)
         * @example {
         *   result: {
         *     download: "https://...",
         *     title: "...",
         *     artists: "...",
         *     image: "...",
         *     external_url: "...",
         *     duration_ms: 180000
         *   }
         * }
         */
        const oota = json.result;
        if (oota?.download && oota?.title && oota?.artists && oota?.image && oota?.external_url) {
            return {
                success: true,
                title: oota.title || "Unknown Track",
                channel: oota.artists || "Unknown Artist",
                cover: oota.image || null,
                url: oota.external_url || null,
                duration: oota.duration_ms || 0,
                downloadUrl: oota.download,
            };
        }

        /**
         * Format 3: Kyyokat API format (simple structure)
         * @example {
         *   result: {
         *     audio: "https://...",
         *     title: "...",
         *     artist: "...",
         *     thumbnail: "...",
         *     url: "..."
         *   }
         * }
         */
        const kyy = json.result;
        if (kyy?.audio && kyy?.title && kyy?.artist && kyy?.thumbnail && kyy?.url) {
            return {
                success: true,
                title: kyy.title || "Unknown Track",
                channel: kyy.artist || "Unknown Artist",
                cover: kyy.thumbnail || null,
                url: kyy.url || null,
                downloadUrl: kyy.audio,
            };
        }
    }

    /**
     * All endpoints failed to return usable data
     * @return {Object} Failure response with error message
     */
    return {
        success: false,
        error: "No downloadable track found from any provider. The track may be unavailable, region-restricted, or the search query was invalid.",
    };
}