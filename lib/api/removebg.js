import { uploader } from "../uploader.js";

export async function removebg(buffer) {
    const up = await uploader(buffer).catch(() => null);
    if (!up || !up.url) return { success: false, error: "Upload failed" };

    const encoded = encodeURIComponent(up.url);
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
            const result = json?.result || json?.data?.result || json?.output || null;
            const success = json?.success === true || json?.status === true;

            if (success && result) {
                return {
                    success: true,
                    resultUrl: result,
                };
            }
        } else if (/image\/(png|jpe?g|webp)/.test(contentType)) {
            let arrayBuffer = null;
            try {
                const chunks = [];
                const reader = res.body.getReader();
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                
                reader.releaseLock();
                
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

    return { success: false, error: "All background removal attempts failed" };
}