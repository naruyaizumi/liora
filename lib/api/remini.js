import { uploader3 } from "../uploader.js";
import { fetch } from "liora-lib";

export async function remini(buffer) {
    const url = await uploader3(buffer).catch(() => null);
    if (!url) return { success: false, error: "Upload failed" };

    const encoded = encodeURIComponent(url);
    const attempts = [
        `https://api.nekolabs.web.id/tools/ihancer?imageUrl=${encoded}=high`,
        `https://api.nekolabs.web.id/tools/pxpic/upscale?imageUrl=${encoded}`,
        `https://api.nekolabs.web.id/tools/real-esrgan/v1?imageUrl=${encoded}&scale=5`,
        `https://api.nekolabs.web.id/tools/real-esrgan/v1?imageUrl=${encoded}&scale=10`,
        `https://api.nekolabs.web.id/tools/real-esrgan/v2?imageUrl=${encoded}&scale=5`,
        `https://api.nekolabs.web.id/tools/real-esrgan/v2?imageUrl=${encoded}&scale=10`,
        `https://api.siputzx.my.id/api/tools/upscale?url=${encoded}&scale=5`,
        `https://api.elrayyxml.web.id/api/tools/remini?url=${encoded}`,
        `https://api.elrayyxml.web.id/api/tools/upscale?url=${encoded}&resolusi=5`,
    ];

    for (const url of attempts) {
        const res = await fetch(url).catch(() => null);
        if (!res) continue;

        const contentType = res.headers.get("content-type") || "";

        if (/application\/json/.test(contentType)) {
            const json = await res.json().catch(() => null);
            if (json?.success && json?.result) {
                return {
                    success: true,
                    resultUrl: json.result,
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

    return { success: false, error: "All enhancement methods failed" };
}