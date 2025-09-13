
let handler = async (m, { conn, text, command }) => {
  try {
    const apiKey = '6xfWprwcoMyT4cbwpdfQnWVolqOMx3efEbp9uRK1'
    

    const apodResponse = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}&thumbs=true`)
    const apodData = await apodResponse.json()
    

    const newsResponse = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}&count=3`)
    const newsData = await newsResponse.json()
    

    let daftarBerita = ''
    if (Array.isArray(newsData)) {
      daftarBerita = newsData.slice(0, 3).map(berita => {
        return `• *${berita.title}* - ${berita.date}\n${berita.explanation.substring(0, 60)}...`
      }).join('\n\n')
    }

    const pesan = `
╭─「 *🚀 INFO TERBARU DARI NASA* 」
│
│ *🌌 Gambar Astronomi Hari Ini:*
│ *${apodData.title || 'Gambar Harian NASA'}*
│ ${apodData.explanation ? apodData.explanation.substring(0, 120) + '...' : 'Tidak ada deskripsi'}
│
│ *📡 Berita Terkini NASA:*
│ ${daftarBerita || 'Tidak ada berita terbaru'}
│
│ *🔗 Info Lebih Lanjut:*
│ https://www.nasa.gov
│
│ *🔄 Pembaruan Terakhir:* ${new Date().toLocaleTimeString('id-ID')}
╰───────────────
`.trim()

    await conn.sendMessage(m.chat, {
      text: pesan,
      contextInfo: {
        externalAdReply: {
          title: `*NASA ${apodData.title || 'Pembaruan Harian'}*`,
          body: 'Berita & gambar terbaru dari luar angkasa 🌠',
          thumbnailUrl: apodData.url || apodData.thumbnail_url || 'https://i.imgur.com/JNlKd0Q.jpg',
          sourceUrl: 'https://www.nasa.gov',
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    })

  } catch (e) {
    console.error('Error:', e)
    await conn.reply(m.chat, `*⚠️ Gagal mengambil data NASA!*\nError: ${e.message}`, m)
  }
}

handler.help = ['nasa'];
handler.command = /^(nasa|beritanasa|angkasa)$/i
handler.tags = ['info']
handler.limit = true;
handler.register = true;

export default handler;