/**
 * @file YouTube Music search and download utility
 * @module downloader/play
 * @description Multi-endpoint YouTube Music search and downloader with
 * metadata extraction and fallback strategy for audio content.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Searches and retrieves YouTube Music track with metadata and download URL
 * @async
 * @function play
 * @param {string} query - Search query (song title, artist, YouTube URL)
 * @returns {Promise<Object>} Track information and download data
 *
 * @returns
 * - Success: {
 *     success: true,
 *     title: string,
 *     channel: string,
 *     cover: string,
 *     url: string,
 *     downloadUrl: string
 *   }
 * - Failure: { success: false, error: string }
 *
 * @features
 * 1. Multi-endpoint fallback for redundancy
 * 2. Metadata extraction (title, artist, thumbnail)
 * 3. YouTube URL resolution for direct links
 * 4. Audio download URL retrieval
 *
 * @supportedInputs
 * - Song titles: "Shape of You Ed Sheeran"
 * - Artist + song: "Taylor Swift Blank Space"
 * - YouTube URLs: "https://youtube.com/watch?v=..."
 * - YouTube Music URLs: "https://music.youtube.com/watch?v=..."
 */
export async function play(query) {
    const encoded = encodeURIComponent(query);

    /**
     * API endpoints for YouTube Music search with priority order
     * @private
     * @constant {Array<string>}
     */
    const endpoints = [
        `https://api.nekolabs.web.id/downloader/youtube/play/v1?q=${encoded}`,
        `https://api.ootaizumi.web.id/downloader/youtube-play?query=${encoded}`,
        `https://anabot.my.id/api/download/playmusic?query=${encoded}&apikey=freeApikey`,
        `https://api.elrayyxml.web.id/api/downloader/ytplay?q=${encoded}`,
    ];

    /**
     * Attempt each endpoint until successful or all fail
     * @private
     * @loop
     */
    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        let json;
        try {
            json = await res.json();
        } catch {
            continue;
        }

        if (!json || (!json.success && !json.status)) continue;

        /**
         * Format 1: Nekolabs API format
         * @example {
         *   result: {
         *     downloadUrl: "https://...",
         *     metadata: {
         *       title: "...",
         *       channel: "...",
         *       cover: "...",
         *       url: "..."
         *     }
         *   }
         * }
         */
        if (json.result?.downloadUrl && json.result?.metadata) {
            const { title, channel, cover, url } = json.result.metadata;
            return {
                success: true,
                title: title || "Unknown Title",
                channel: channel || "Unknown Artist",
                cover: cover || null,
                url: url || null,
                downloadUrl: json.result.downloadUrl,
            };
        }

        /**
         * Format 2: Ootaizumi API format
         * @example {
         *   result: {
         *     download: "https://...",
         *     title: "...",
         *     author: { name: "..." },
         *     thumbnail: "...",
         *     url: "..."
         *   }
         * }
         */
        if (json.result?.download && json.result?.title) {
            return {
                success: true,
                title: json.result.title || "Unknown Title",
                channel: json.result.author?.name || "Unknown Channel",
                cover: json.result.thumbnail || null,
                url: json.result.url || null,
                downloadUrl: json.result.download,
            };
        }

        /**
         * Format 3: Anabot API format
         * @example {
         *   data: {
         *     result: {
         *       success: true,
         *       urls: "https://...",
         *       metadata: {
         *         title: "...",
         *         channel: "...",
         *         thumbnail: "...",
         *         webpage_url: "..."
         *       }
         *     }
         *   }
         * }
         */
        const ana = json.data?.result;
        if (ana?.success && ana?.urls && ana?.metadata) {
            return {
                success: true,
                title: ana.metadata.title || "Unknown Title",
                channel: ana.metadata.channel || "Unknown Channel",
                cover: ana.metadata.thumbnail || null,
                url: ana.metadata.webpage_url || null,
                downloadUrl: ana.urls,
            };
        }

        /**
         * Format 4: Elray XML API format
         * @example {
         *   result: {
         *     download_url: "https://...",
         *     title: "...",
         *     channel: "...",
         *     thumbnail: "...",
         *     url: "..."
         *   }
         * }
         */
        const elray = json.result;
        if (
            elray?.download_url &&
            elray?.title &&
            elray?.channel &&
            elray?.thumbnail &&
            elray?.url
        ) {
            return {
                success: true,
                title: elray.title || "Unknown Title",
                channel: elray.channel || "Unknown Channel",
                cover: elray.thumbnail || null,
                url: elray.url || null,
                downloadUrl: elray.download_url,
            };
        }
    }

    /**
     * All endpoints failed to return usable data
     * @return {Object} Failure response with error message
     */
    return {
        success: false,
        error: "No downloadable track found from any provider. The track may be unavailable, restricted, or the search query was invalid.",
    };
}
