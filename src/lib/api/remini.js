/**
 * @file Image enhancement and upscaling module
 * @module lib/remini
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import { uploader } from "#lib/uploader.js";

/**
 * Enhances image quality using multiple upscaling APIs
 * @async
 * @function remini
 * @param {Buffer} buf - Image buffer to enhance
 * @returns {Promise<Object>} Enhancement result
 * @property {boolean} success - Whether enhancement succeeded
 * @property {string} [resultUrl] - URL of enhanced image
 * @property {Buffer} [resultBuffer] - Buffer of enhanced image
 * @property {string} [error] - Error message if failed
 *
 * @description
 * Attempts to enhance image quality using various upscaling APIs.
 * Tries multiple endpoints until success or all fail.
 *
 * @features
 * - Tries multiple upscaling APIs sequentially
 * - Returns either URL or Buffer depending on API
 * - Handles both JSON and direct image responses
 * - Fallback to next API if current fails
 */

export async function remini(buf) {
    const up = await uploader(buf).catch(() => null);
    if (!up || !up.url) return { success: false, error: "Upload failed" };

    const enc = encodeURIComponent(up.url);
    const urls = [
        `https://api.nekolabs.web.id/tools/pxpic/upscale?imageUrl=${enc}`,
        `https://api.nekolabs.web.id/tools/pxpic/enhance?imageUrl=${enc}`,
        `https://api.nekolabs.web.id/tools/ihancer?imageUrl=${enc}`,
        `https://api.zenzxz.my.id/api/tools/upscale?url=${enc}`,
        `https://api.zenzxz.my.id/api/tools/upscalev2?url=${enc}&scale=2`,
        `https://api.zenzxz.my.id/api/tools/upscalev2?url=${enc}&scale=4`,
        `https://api.siputzx.my.id/api/iloveimg/upscale?image=${enc}&scale=2`,
        `https://api.ootaizumi.web.id/tools/upscale?imageUrl=${enc}`,
        `https://api.elrayyxml.web.id/api/tools/remini?url=${enc}`,
        `https://api.elrayyxml.web.id/api/tools/upscale?url=${enc}&resolusi=5`,
    ];

    for (const url of urls) {
        const res = await fetch(url).catch(() => null);
        if (!res) continue;
        const type = res.headers.get("content-type") || "";

        if (type.includes("application/json")) {
            const json = await res.json().catch(() => null);

            if (json?.result) {
                return { success: true, resultUrl: json.result };
            }
            if (json?.data?.url) {
                return { success: true, resultUrl: json.data.url };
            }
            if (json?.result?.imageUrl) {
                return { success: true, resultUrl: json.result.imageUrl };
            }
        }

        if (type.includes("image")) {
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
                const buf = Buffer.from(arrBuf);
                if (buf.length) return { success: true, resultBuffer: buf };
            }
        }
    }

    return { success: false, error: "All methods failed" };
}
