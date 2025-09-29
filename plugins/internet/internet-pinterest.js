let handler = async (m, { conn, text }) => {
    if (!text) return m.reply("🍜 *Masukkan kata kunci untuk mencari gambar di Pinterest!*")
    try {
        await global.loading(m, conn)

        const apiUrl = global.API("btz", "/api/search/pinterest", { text1: text }, "apikey")
        const response = await fetch(apiUrl)
        if (!response.ok) throw new Error(`API Error: ${response.status} - ${response.statusText}`)
        const json = await response.json()

        if (!json.result || json.result.length === 0)
            return m.reply("🍱 *Tidak ada hasil untuk kata kunci tersebut!*")
            
        const results = json.result.slice(0, 50)

        let albumItems = results.map((img, i) => ({
            image: { url: img },
            caption: `🍣 Pinterest Result (${i + 1}/${results.length})`
        }))

        await conn.sendAlbumMessage(m.chat, albumItems, { quoted: m, delay: 500 })

    } catch (error) {
        console.error(error)
        m.reply("🍡 *Terjadi kesalahan saat mengambil data dari Pinterest. Coba lagi nanti!*")
    } finally {
        await global.loading(m, conn, true)
    }
}

handler.help = ["pinterest"]
handler.tags = ["internet"]
handler.command = /^(pinterest|pin)$/i

export default handler