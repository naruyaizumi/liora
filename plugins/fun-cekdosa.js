
const handler = async (m, { conn, usedPrefix, command }) => {
    try {
        const target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
        const nama = conn.getName(target)
        
        const levelDosa = Math.min(
            Math.floor(Math.random() * 100) + 
            Math.floor(Math.random() * 30), 
            150
        )

        const meterLength = Math.max(0, Math.min(10, Math.floor(levelDosa / 10)))
        const meterDosa = '🟥'.repeat(meterLength) + '⬜'.repeat(10 - meterLength)
        
        const kategoriDosa = [
            { range: [0, 20], emoji: '👼', pesan: `${nama} masih polos kayak bayi` },
            { range: [21, 40], emoji: '😇', pesan: `${nama} cuma ngumpulin dosa receh` },
            { range: [41, 60], emoji: '😅', pesan: `${nama} uda mulai nakal nih` },
            { range: [61, 80], emoji: '👿', pesan: `${nama} uda level setan junior` },
            { range: [81, 100], emoji: '🔥', pesan: `${nama} uda bisa jadi calon penghuni neraka` },
            { range: [101, 150], emoji: '💀', pesan: `WADUHHH ${nama} DOSANYA NGENTOT!` }
        ]

        const cekKategori = () => kategoriDosa.find(kat => levelDosa >= kat.range[0] && levelDosa <= kat.range[1]) || kategoriDosa[0]
        const { emoji, pesan } = cekKategori()
        
        const daftarDosa = [
            'Suka ghosting orang',
            'Tukang spoiler film',
            'Hapus chat penting',
            'Pamer waifu mulu',
            'Janji banyak ga ditepatin',
            'Chat "yaudah" trus kabur',
            'Maling meme orang',
            'Tag random seenaknya',
            'Banyak bacot ga jelas'
        ]

        const dosaRandom = []
        while (dosaRandom.length < 3 && daftarDosa.length > 0) {
            const randomIndex = Math.floor(Math.random() * daftarDosa.length)
            dosaRandom.push(daftarDosa.splice(randomIndex, 1)[0])
        }

        const hasilCek = 
`*📜 LAPORAN DOSA ${nama.toUpperCase()}*

${emoji} *LEVEL:* ${levelDosa}/100
${meterDosa}

📌 *STATUS:* ${pesan}

📃 *DOSA TERAKHIR:*
${dosaRandom.map(dosa => `✧ ${dosa}`).join('\n')}

${levelDosa > 80 ? '💢 *WARNING:* Wah bahaya nih, mending tobat dulu dah!' : '🟢 *RESULT:* Masih aman sih, santuy aja'}`

        await conn.reply(m.chat, hasilCek, m, {
            mentions: [target],
            contextInfo: {
                externalAdReply: {
                    title: `NIH HASIL CEK DOSA MU ${levelDosa > 80 ? 'PARAH' : 'LUMAYAN'}`,
                    body: `Target: ${nama}`,
                    thumbnailUrl: levelDosa > 80 ? 
                        'https://files.catbox.moe/bxgmxr.jpeg' : 
                        'https://files.catbox.moe/h39dks.jpeg',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        })

    } catch (error) {
        console.error('Error di cekdosa:', error)
        await conn.reply(m.chat, `Gagal cek dosa nih, coba lagi ya. Error: ${error.message}`, m)
    }
}

handler.help = ['cekdosa']
handler.tags = ['fun']
handler.command = /^(cekdosa|cekdos)$/i
handler.limit = true;
handler.register = true;

export default handler;