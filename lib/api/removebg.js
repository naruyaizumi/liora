import { uploader3 } from "../uploader.js";
import { fetch } from "liora-lib";

export async function removebg(buffer) {
    const url = await uploader3(buffer).catch(() => null);
    if (!url) return { success: false, error: "Upload failed" };

    const encoded = encodeURIComponent(url);
    const endpoints = [
        `https://api.nekolabs.web.id/tools/remove-bg/v1?imageUrl=${encoded}`,
        `https://api.nekolabs.web.id/tools/remove-bg/v2?imageUrl=${encoded}`,
        `https://api.nekolabs.web.id/tools/remove-bg/v3?imageUrl=${encoded}`,
        `https://api.nekolabs.web.id/tools/remove-bg/v4?imageUrl=${encoded}`,
        `https://api.ootaizumi.web.id/tools/removebg?imageUrl=${encoded}`,
        `https://api.elrayyxml.web.id/api/tools/removebg?url=${encoded}`,
    ];

    for (const endpoint of endpoints) {
        const res = await fetch(endpoint).catch(() => null);
        if (!res) continue;

        const contentType = res.headers.get("content-type") || "";

        if (/application\/json/.test(contentType)) {
            const json = await res.json().catch(() => null);
            const result =
                json?.result ||
                json?.data?.result ||
                json?.output ||
                null;

            const success =
                json?.success === true ||
                json?.status === true;

            if (success && result) {
                return {
                    success: true,
                    resultUrl: result,
                };
            }
        } else if (/image\/(png|jpe?g|webp)/.test(contentType)) {
            const buffer = await res.arrayBuffer().catch(() => null);
            if (buffer) {
                return {
                    success: true,
                    resultBuffer: Buffer.from(buffer),
                };
            }
        }
    }

    return { success: false, error: "All background removal attempts failed" };
}