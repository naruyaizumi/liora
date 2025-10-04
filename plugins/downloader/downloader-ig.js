import { fileTypeFromBuffer } from "file-type";

let handler = async (m, { conn, usedPrefix, command, args }) => {
    if (!args[0]) {
        return m.reply(
            `🍡 *Masukkan URL Instagram yang valid!*\n🍰 *Contoh: ${usedPrefix + command} https://www.instagram.com*`
        )
    }

    const url = args[0]
    if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url)) {
        return m.reply("🍰 *URL tidak valid! Kirimkan link Instagram yang benar, ya.*")
    }

    try {
        await global.loading(m, conn)

        const apiUrl = global.API("btz", "/api/download/igdowloader", { url }, "apikey")
        const json = await fetch(apiUrl).then((res) => res.json())

        if (!json.status || !json.message || json.message.length === 0) {
            return m.reply("🍓 *Kontennya nggak ditemukan!*")
        }

        let sent = new Set()
        let album = []

        for (let content of json.message) {
            if (!content._url || sent.has(content._url)) continue
            sent.add(content._url)

            try {
                let res = await fetch(content._url)
                let buffer = Buffer.from(await res.arrayBuffer())
                let file = await fileTypeFromBuffer(buffer)
                if (!file) continue

                if (file.mime.startsWith("image")) {
                    album.push({
                        type: "image",
                        url: content._url,
                        caption: "🍡 Foto Instagram",
                    })
                } else if (file.mime.startsWith("video")) {
                    album.push({
                        type: "video",
                        url: content._url,
                        caption: "🍡 Video Instagram",
                    })
                }
            } catch (err) {
                console.error("🍮 Gagal analisis konten:", content._url, err)
            }
        }

        if (album.length === 0) {
            return m.reply("🍧 *Tidak ada konten valid yang bisa diunduh.*")
        }

        for (let i = 0; i < album.length; i++) {
            let item = album[i]
            if (item.type === "image") {
                await conn.sendMessage(
                    m.chat,
                    { image: { url: item.url }, caption: `*${item.caption} (${i + 1}/${album.length})*` },
                    { quoted: m }
                )
            } else if (item.type === "video") {
                await conn.sendMessage(
                    m.chat,
                    { video: { url: item.url }, caption: `*${item.caption} (${i + 1}/${album.length})*` },
                    { quoted: m }
                )
            }
        }
    } catch (err) {
        console.error(err)
        m.reply("🍮 *Terjadi kesalahan saat mengambil data dari Instagram. Coba lagi nanti!*")
    } finally {
        await global.loading(m, conn, true)
    }
}

handler.help = ["instagram"]
handler.tags = ["downloader"]
handler.command = /^(instagram|ig|igdl)$/i

export default handler