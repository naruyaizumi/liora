/**
 * @file Image enhancement and upscaling utility
 * @module enhancer/remini
 * @description Multi-endpoint image enhancement service for AI-based
 * upscaling, quality improvement, and restoration of low-quality images.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { uploader } from "#lib/uploader.js";

/**
 * Enhances image quality using AI-powered upscaling and restoration
 * @async
 * @function remini
 * @param {Buffer|Uint8Array} buffer - Input image buffer to enhance
 * @returns {Promise<Object>} Enhancement result with processed image
 *
 * @returns
 * - Success (URL): { success: true, resultUrl: string }
 * - Success (Buffer): { success: true, resultBuffer: Buffer }
 * - Failure: { success: false, error: string }
 *
 * @features
 * 1. Multi-service fallback with 10 different enhancement endpoints
 * 2. Support for both URL-based and direct buffer returns
 * 3. Multiple enhancement types (upscale, enhance, AI restoration)
 * 4. Variable upscale factors (2x, 4x, 5x)
 *
 * @capabilities
 * - Increase image resolution without quality loss
 * - Reduce noise and compression artifacts
 * - Restore details in blurry images
 * - Color correction and enhancement
 * - Face enhancement and restoration
 *
 * @limitations
 * - Processing time varies by service (5-30 seconds)
 * - Large images may be downscaled by some services
 * - Watermarks may be added by free services
 * - Some services have daily rate limits
 */
export async function remini(buffer) {
    /**
     * Upload image to temporary hosting for URL-based processing
     * @private
     * @variable {Object|null}
     */
    const up = await uploader(buffer).catch(() => null);
    if (!up || !up.url)
        return { success: false, error: "Image upload failed for enhancement processing" };

    const encoded = encodeURIComponent(up.url);

    /**
     * Enhancement service endpoints with priority order and varied capabilities
     * @private
     * @constant {Array<string>}
     */
    const attempts = [
        // Elrayy services (quinary - multiple resolution options)
        `https://api.elrayyxml.web.id/api/tools/remini?url=${encoded}`,
        `https://api.elrayyxml.web.id/api/tools/upscale?url=${encoded}&resolusi=5`, // 5x resolution
        
        // Zenzxz services (secondary - various upscale factors)
        `https://api.zenzxz.my.id/api/tools/upscale?url=${encoded}`,
        `https://api.zenzxz.my.id/api/tools/upscalev2?url=${encoded}&scale=2`, // 2x upscale
        `https://api.zenzxz.my.id/api/tools/upscalev2?url=${encoded}&scale=4`, // 4x upscale

        // Nekolabs services (primary)
        `https://api.nekolabs.web.id/tools/pxpic/upscale?imageUrl=${encoded}`,
        `https://api.nekolabs.web.id/tools/pxpic/enhance?imageUrl=${encoded}`,
        `https://api.nekolabs.web.id/tools/ihancer?imageUrl=${encoded}`,

        // Siputzx service (tertiary)
        `https://api.siputzx.my.id/api/iloveimg/upscale?image=${encoded}&scale=2`,

        // Ootaizumi service (quaternary)
        `https://api.ootaizumi.web.id/tools/upscale?imageUrl=${encoded}`,

    ];

    /**
     * Attempt each enhancement service until successful or all fail
     * @private
     * @loop
     */
    for (const url of attempts) {
        const res = await fetch(url).catch(() => null);
        if (!res) continue;

        /**
         * Determine response content type to handle different return formats
         * @private
         * @variable {string}
         */
        const type = res.headers.get("content-type") || "";

        /**
         * Format 1: JSON response with result URL
         * Most services return JSON with enhanced image URL
         * @private
         */
        if (type.includes("application/json")) {
            const json = await res.json().catch(() => null);

            // Nekolabs/Zenzxz format
            if (json?.result) {
                return {
                    success: true,
                    resultUrl: json.result,
                };
            }

            // Siputzx format
            if (json?.data?.url) {
                return {
                    success: true,
                    resultUrl: json.data.url,
                };
            }

            // Ootaizumi format
            if (json?.result?.imageUrl) {
                return {
                    success: true,
                    resultUrl: json.result.imageUrl,
                };
            }
        }

        /**
         * Format 2: Direct image response (binary data)
         * Some services return the enhanced image directly
         * @private
         */
        if (type.includes("image")) {
            let arrayBuffer = null;
            try {
                // Stream and collect response chunks
                const chunks = [];
                const reader = res.body.getReader();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }

                reader.releaseLock();

                // Combine all chunks into single buffer
                const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                const combined = new Uint8Array(totalLength);
                let offset = 0;

                for (const chunk of chunks) {
                    combined.set(chunk, offset);
                    offset += chunk.length;
                }

                arrayBuffer = combined.buffer;
            } catch {
                arrayBuffer = null;
            }

            if (arrayBuffer) {
                const buf = Buffer.from(arrayBuffer);
                if (buf.length) {
                    return {
                        success: true,
                        resultBuffer: buf,
                    };
                }
            }
        }
    }

    /**
     * All enhancement services failed
     * @return {Object} Failure response with error message
     */
    return {
        success: false,
        error: "All enhancement methods failed. This may be due to rate limits, service downtime, or incompatible image format.",
    };
}
