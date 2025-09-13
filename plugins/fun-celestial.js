
let handler = async (m, { conn }) => {
  try {
    await conn.sendMessage(m.chat, { text: "*🌌 MENGAMBIL DATA BENDA LANGIT...*" }, { quoted: m })
    
    const response = await fetch('https://api.le-systeme-solaire.net/rest/bodies/')
    if (!response.ok) throw new Error(`*🚨 API ERROR:* ${response.status}`)
    
    const { bodies } = await response.json()
    if (!bodies?.length) throw new Error('*🚫 DATA TIDAK DITEMUKAN*')

    const formatData = (body) => {
      const name = body.englishName || "*Tidak Diketahui*"
      const gravity = body.gravity ? `*${body.gravity} m/s²*` : "*Data Tidak Tersedia*"
      const density = body.density ? `*${body.density} g/cm³*` : "*Data Tidak Tersedia*"
      const moons = body.moons?.length || 0
      const discoveredBy = body.discoveredBy || "*Tidak Diketahui*"
      const discoveryDate = body.discoveryDate || "*Tidak Diketahui*"
      const meanRadius = body.meanRadius ? `*${body.meanRadius} km*` : "*Data Tidak Tersedia*"
      const distanceSun = body.semimajorAxis ? `*${(body.semimajorAxis/1000000).toFixed(2)} juta km*` : "*Data Tidak Tersedia*"

      return `✨ *NAMA:* ${name}\n` +
             `🌍 *RADIUS:* ${meanRadius}\n` +
             `🌞 *JARAK MATAHARI:* ${distanceSun}\n` +
             `🌐 *GRAVITASI:* ${gravity}\n` +
             `🧪 *KEPADATAN:* ${density}\n` +
             `🌙 *BULAN:* ${moons}\n` +
             `🔭 *PENEMU:* ${discoveredBy}\n` +
             `📅 *TGL PENEMUAN:* ${discoveryDate}`
    }

    const FAKTA_STATIS = [
      "*🌠 FAKTA:* Bintang Neutron memiliki massa 1,4x Matahari dalam diameter 20km!",
      "*🌌 FAKTA:* Galaksi Andromeda akan bertabrakan dengan Bima Sakti dalam 4 miliar tahun",
      "*🌜 FAKTA:* Bulan berjarak 384.400 km dari Bumi",
      "*☄️ FAKTA:* Komet terbuat dari es dan debu dengan ekor indah",
      "*🌍 FAKTA:* Medan magnet Bumi melindungi dari radiasi luar angkasa",
      "*🪐 FAKTA:* Saturnus memiliki sistem cincin terbesar di tata surya",
      "*⚫ FAKTA:* Tidak ada yang bisa lolos dari gravitasi lubang hitam",
      "*🚀 FAKTA:* Voyager 1 sekarang berada di ruang antar bintang"
    ]

    const randomBody = bodies[Math.floor(Math.random() * bodies.length)]
    const randomFact = FAKTA_STATIS[Math.floor(Math.random() * FAKTA_STATIS.length)]
    
    const result = Math.random() > 0.5 
      ? `${formatData(randomBody)}\n\n*💡 FAKTA TAMBAHAN:*\n${randomFact}`
      : randomFact

    await conn.sendMessage(m.chat, { 
      text: `*🌠 FAKTA ASTRONOMI*\n\n${result}\n\n*🔗 Sumber:* NASA Solar System API`, 
      contextInfo: { mentionedJid: [m.sender] }
    }, { quoted: m })

  } catch (error) {
    console.error(error)
    await conn.sendMessage(m.chat, { 
      text: `*⚠️ ERROR*\n${error.message}` 
    }, { quoted: m })
  }
}

handler.help = ['celestial']
handler.command = ['celestial']
handler.tags = ['fun']
handler.limit = true
handler.register = true

export default handler