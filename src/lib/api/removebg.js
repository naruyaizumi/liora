/**
 * @file Background removal utility
 * @module enhancer/removebg
 * @description Multi-endpoint background removal service using AI
 * to extract foreground subjects and create transparent backgrounds.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { uploader } from "#lib/uploader.js";

/**
 * Removes background from image using AI-powered segmentation
 * @async
 * @function removebg
 * @param {Buffer|Uint8Array} buffer - Input image buffer for background removal
 * @returns {Promise<Object>} Background removal result
 * 
 * @returns
 * - Success (URL): { success: true, resultUrl: string }
 * - Success (Buffer): { success: true, resultBuffer: Buffer }
 * - Failure: { success: false, error: string }
 * 
 * @features
 * 1. Multi-service fallback with 6 different AI endpoints
 * 2. Support for both URL-based and direct buffer returns
 * 3. PNG output with transparency (alpha channel)
 * 4. Intelligent subject detection and edge refinement
 * 
 * @capabilities
 * - Remove complex backgrounds (nature, interiors, patterns)
 * - Preserve fine details (hair, fur, translucent edges)
 * - Handle multiple subjects in single image
 * - Maintain original image quality and resolution
 * - Output PNG with transparent background
 * 
 * @limitations
 * - May struggle with low-contrast subjects
 * - Complex edges (hair, fur) may have artifacts
 * - Some services have resolution limits
 * - Processing time varies (2-15 seconds)
 */
export async function removebg(buffer) {
    /**
     * Upload image to temporary hosting for URL-based processing
     * Most AI services require public URLs for processing
     * @private
     * @variable {Object|null}
     */
    const up = await uploader(buffer).catch(() => null);
    if (!up || !up.url) return { 
        success: false, 
        error: "Image upload failed for background removal processing" 
    };

    const encoded = encodeURIComponent(up.url);
    
    /**
     * Background removal service endpoints with priority order
     * Different versions may use different AI models
     * @private
     * @constant {Array<string>}
     */
    const endpoints = [
        // Nekolabs services (primary - multiple model versions)
        `https://api.nekolabs.web.id/tools/remove-bg/v1?imageUrl=${encoded}`, // Version 1
        `https://api.nekolabs.web.id/tools/remove-bg/v2?imageUrl=${encoded}`, // Version 2
        `https://api.nekolabs.web.id/tools/remove-bg/v3?imageUrl=${encoded}`, // Version 3
        `https://api.nekolabs.web.id/tools/remove-bg/v4?imageUrl=${encoded}`, // Version 4
        
        // Ootaizumi service (secondary)
        `https://api.ootaizumi.web.id/tools/removebg?imageUrl=${encoded}`,
        
        // Elrayy service (tertiary)
        `https://api.elrayyxml.web.id/api/tools/removebg?url=${encoded}`,
    ];

    /**
     * Attempt each background removal service until successful or all fail
     * @private
     * @loop
     */
    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        /**
         * Determine response content type for proper handling
         * @private
         * @variable {string}
         */
        const contentType = res.headers.get("content-type") || "";

        /**
         * Format 1: JSON response with result URL
         * Most services return JSON with processed image URL
         * @private
         */
        if (/application\/json/.test(contentType)) {
            const json = await res.json().catch(() => null);
            
            /**
             * Extract result from various JSON response formats
             * Supports different API response structures
             * @private
             * @variable {string|null}
             */
            const result = json?.result || 
                          json?.data?.result || 
                          json?.output || 
                          null;
            
            const success = json?.success === true || 
                           json?.status === true;

            if (success && result) {
                return {
                    success: true,
                    resultUrl: result,
                };
            }
        } 
        /**
         * Format 2: Direct image response (binary PNG)
         * Some services return the transparent image directly
         * @private
         */
        else if (/image\/(png|jpe?g|webp)/.test(contentType)) {
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
                return {
                    success: true,
                    resultBuffer: Buffer.from(arrayBuffer),
                };
            }
        }
    }

    /**
     * All background removal services failed
     * @return {Object} Failure response with error message
     */
    return { 
        success: false, 
        error: "All background removal attempts failed. This may be due to rate limits, service downtime, or the image may not contain a detectable subject." 
    };
}