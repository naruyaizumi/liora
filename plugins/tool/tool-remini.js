import { uploader3 } from "../../lib/uploader.js";
import { fetch } from "liora-lib";

let handler = async (m, { conn, args, command }) => {
    const version = ["1", "2", "3", "4"].includes(args[0]) ? args[0] : "1";
    const q = m.quoted && m.quoted.mimetype ? m.quoted : m;

    if (!q || typeof q.download !== "function" || !/image/.test(q.mimetype || ""))
        return m.reply(`Send or reply to an image first.\n› Example: .${command} 2`);

    try {
        await global.loading(m, conn);

        const media = await q.download().catch(() => null);
        if (!media || !(media instanceof Buffer))
            return m.reply("Failed to download media or unrecognized format.");

        const url = await uploader3(media).catch(() => null);
        if (!url) return m.reply("Failed to upload image. Try again later.");

        const endpointMap = {
            1: "/api/tools/remini",
            2: "/api/tools/remini-v2",
            3: "/api/tools/remini-v3",
            4: "/api/tools/remini-v4",
        };

        const params =
            version === "3"
                ? { url, resolusi: 4 }
                : version === "4"
                  ? { url, resolusi: 16 }
                  : { url };

        const api = global.API("btz", endpointMap[version], params, "apikey");
        const res = await fetch(api);
        if (!res.ok) throw new Error("Failed to process image.");

        const json = await res.json();
        if (!json.status || !json.url) throw new Error("Invalid response from server.");

        await conn.sendMessage(
            m.chat,
            {
                image: { url: json.url },
                caption: `Image processed successfully using ${command.toUpperCase()} (v${version})`,
            },
            { quoted: m }
        );
    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["remini"];
handler.tags = ["tools"];
handler.command = /^(remini|hd)$/i;

export default handler;
