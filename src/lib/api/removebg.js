/**
 * @file Background removal module
 * @module lib/removebg
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { uploader } from "#lib/uploader.js";

/**
 * Removes background from images using multiple APIs
 * @async
 * @function removebg
 * @param {Buffer} buf - Image buffer
 * @returns {Promise<Object>} Removal result
 * @property {boolean} success - Whether removal succeeded
 * @property {string} [resultUrl] - URL of image with removed background
 * @property {Buffer} [resultBuffer] - Buffer of image with removed background
 * @property {string} [error] - Error message if failed
 *
 * @description
 * Attempts to remove image background using various removal APIs.
 * Tries multiple endpoints until success or all fail.
 *
 * @features
 * - Tries multiple background removal APIs sequentially
 * - Returns either URL or Buffer depending on API
 * - Handles both JSON and direct image responses
 * - Fallback to next API if current fails
 */

export async function removebg(buf) {
    const up = await uploader(buf).catch(() => null);
    if (!up || !up.url) return { success: false, error: "Upload failed" };

    const enc = encodeURIComponent(up.url);
    const urls = [
        `https://api.nekolabs.web.id/tools/remove-bg/v1?imageUrl=${enc}`,
        `https://api.nekolabs.web.id/tools/remove-bg/v2?imageUrl=${enc}`,
        `https://api.nekolabs.web.id/tools/remove-bg/v3?imageUrl=${enc}`,
        `https://api.nekolabs.web.id/tools/remove-bg/v4?imageUrl=${enc}`,
        `https://api.ootaizumi.web.id/tools/removebg?imageUrl=${enc}`,
        `https://api.elrayyxml.web.id/api/tools/removebg?url=${enc}`,
    ];

    for (const url of urls) {
        const res = await fetch(url).catch(() => null);
        if (!res) continue;

        const type = res.headers.get("content-type") || "";

        if (/application\/json/.test(type)) {
            const json = await res.json().catch(() => null);
            const out = json?.result || json?.data?.result || json?.output || null;
            const ok = json?.success === true || json?.status === true;

            if (ok && out) {
                return {
                    success: true,
                    resultUrl: out,
                };
            }
        } else if (/image\/(png|jpe?g|webp)/.test(type)) {
            let arrBuf = null;
            try {
                const chunks = [];
                const reader = res.body.getReader();

                while (true) {
                    const { done, val } = await reader.read();
                    if (done) break;
                    chunks.push(val);
                }

                reader.releaseLock();

                const total = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                const comb = new Uint8Array(total);
                let off = 0;

                for (const chunk of chunks) {
                    comb.set(chunk, off);
                    off += chunk.length;
                }

                arrBuf = comb.buffer;
            } catch {
                arrBuf = null;
            }

            if (arrBuf) {
                return {
                    success: true,
                    resultBuffer: Buffer.from(arrBuf),
                };
            }
        }
    }

    return { success: false, error: "All methods failed" };
}
