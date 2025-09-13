
const BASE_URL = 'https://bukuacak-9bdcb4ef2605.herokuapp.com/api/v1/stats/genre';

let handler = async (m, { conn, usedPrefix, command, args }) => {
    await global.loading(m, conn);

    try {
        const response = await fetch(BASE_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });


        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const statsData = await response.json();
        const genreStatistics = statsData.genre_statistics || [];


        if (genreStatistics.length === 0) {
            throw new Error('Tidak ada statistik genre yang ditemukan.');
        }


        const formattedStats = genreStatistics.map((genreStat, index) => {
            return `📚 *${index + 1}. Genre:* ${genreStat.genre || 'N/A'}\n▸ *Jumlah Buku:* ${genreStat.count}`;
        }).join('\n\n━━━━━━━━━━━━━━\n\n');


        await conn.reply(m.chat, 
            `📊 *STATISTIK GENRE BUKU*\n\n${formattedStats}\n\n*Total Genre:* ${statsData.total_genres}`, 
            m, {
                contextInfo: {
                    externalAdReply: {
                        title: "Statistik Genre Buku",
                        body: "Informasi lengkap tentang genre buku",
                        thumbnailUrl: "https://i.imgur.com/5XrJYdD.jpg",
                        sourceUrl: BASE_URL,
                        mediaType: 1
                    }
                }
            }
        );

    } catch (error) {
        console.error('Error fetching genre statistics:', error);
        
        let errorMessage = '⚠ *GAGAL MENGAMBIL STATISTIK GENRE*\n\n';
        
        if (error.message.includes('404')) {
            errorMessage += '*Statistik tidak ditemukan.* Coba lagi nanti.';
        } else if (error.message.includes('500')) {
            errorMessage += '*Kesalahan server.* Coba lagi nanti.';
        } else {
            errorMessage += `*Error:* ${error.message}`;
        }
        
        await conn.reply(m.chat, errorMessage, m, {
            contextInfo: {
                externalAdReply: {
                    title: "Error System",
                    body: "Statistik tidak tersedia",
                    thumbnailUrl: "https://i.imgur.com/8Km9tLL.png"
                }
            }
        });
    }
};

handler.help = ['genrestats'];
handler.tags = ['search'];
handler.command = /^(genrestats|statsgenre)$/i;
handler.register = true;
handler.limit = true;

export default handler;