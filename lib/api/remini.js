import { uploader } from "../uploader.js";

export async function remini(buffer) {
    const up = await uploader(buffer).catch(() => null);
    if (!up || !up.url) return { success: false, error: "Upload failed" };

    const encoded = encodeURIComponent(up.url);
    const attempts = [
        `https://api.nekolabs.web.id/tools/pxpic/upscale?imageUrl=${encoded}`,
        `https://api.nekolabs.web.id/tools/pxpic/enhance?imageUrl=${encoded}`,
        `https://api.nekolabs.web.id/tools/ihancer?imageUrl=${encoded}`,
        `https://api.zenzxz.my.id/api/tools/upscale?url=${encoded}`,
        `https://api.zenzxz.my.id/api/tools/upscalev2?url=${encoded}&scale=2`,
        `https://api.zenzxz.my.id/api/tools/upscalev2?url=${encoded}&scale=4`,
        `https://api.siputzx.my.id/api/iloveimg/upscale?image=${encoded}&scale=2`,
        `https://api.ootaizumi.web.id/tools/upscale?imageUrl=${encoded}`,
        `https://api.elrayyxml.web.id/api/tools/remini?url=${encoded}`,
        `https://api.elrayyxml.web.id/api/tools/upscale?url=${encoded}&resolusi=5`
    ];

    for (const url of attempts) {
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
            const buf = Buffer.from(await res.arrayBuffer().catch(() => null) || []);
            if (buf.length) return { success: true, resultBuffer: buf };
        }
    }

    return { success: false, error: "All enhancement methods failed" };
}
