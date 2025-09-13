const BASE_URL = 'http://indonesia-public-static-api.vercel.app/api/volcanoes';

let handler = async (m, { conn, usedPrefix, command, args }) => {
    await global.loading(m, conn);

    try {
        const filters = [];
        
        for (const arg of args) {
            if (arg.startsWith('name=')) {
                const name = arg.split('=')[1];
                filters.push(`name=${encodeURIComponent(name)}`);
            } else if (arg.startsWith('type=')) {
                const type = arg.split('=')[1];
                filters.push(`type=${encodeURIComponent(type)}`);
            } else if (arg.startsWith('min_height=')) {
                const minHeight = arg.split('=')[1];
                filters.push(`min_height=${encodeURIComponent(minHeight)}`);
            } else if (arg.startsWith('max_height=')) {
                const maxHeight = arg.split('=')[1];
                filters.push(`max_height=${encodeURIComponent(maxHeight)}`);
            }
        }

        let url = BASE_URL;
        if (filters.length > 0) {
            url += '?' + filters.join('&');
        } else {
            url += '?type=kompleks';
        }

        console.log('Fetching URL:', url);


        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });


        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const volcanoes = await response.json();


        if (volcanoes.length === 0) {
            throw new Error('Tidak ada gunung berapi ditemukan dengan filter tersebut.');
        }


        const formattedVolcanoes = volcanoes.map((volcano, index) => {
            return `🌋 *${index + 1}. Nama:* ${volcano.nama || 'Nama tidak tersedia'}\n` +
                   `▸ *Bentuk:* ${volcano.bentuk || 'Bentuk tidak tersedia'}\n` +
                   `▸ *Tinggi:* ${volcano.tinggi_meter || 'Tinggi tidak tersedia'}\n` +
                   `▸ *Estimasi Letusan Terakhir:* ${volcano.estimasi_letusan_terakhir || 'Tidak tersedia'}\n` +
                   `▸ *Geolokasi:* ${volcano.geolokasi || 'Tidak tersedia'}`;
        }).join('\n\n━━━━━━━━━━━━━━\n\n');


        await conn.reply(m.chat, 
            `🌋 *DAFTAR GUNUNG BERAPI YANG DITEMUKAN*\n\n${formattedVolcanoes}\n\nSilakan pilih gunung berapi yang ingin Anda ketahui lebih lanjut.`, 
            m
        );

    } catch (error) {
        console.error('Error fetching volcanoes:', error);
        
        let errorMessage = '⚠ GAGAL MENGAMBIL DATA GUNUNG BERAPI\n\n';
        
        if (error.message.includes('404')) {
            errorMessage += 'Halaman tidak ditemukan. Coba dengan filter yang berbeda.';
        } else if (error.message.includes('500')) {
            errorMessage += 'Kesalahan server. Coba lagi nanti.';
        } else {
            errorMessage += `*Error:* ${error.message}`;
        }
        
        await conn.reply(m.chat, errorMessage, m);
    }
};

handler.help = ['getvolcano <name=nama_gunung> <type=jenis_gunung> <min_height=tinggi_minimum> <max_height=tinggi_maksimum>'];
handler.tags = ['info'];
handler.command = /^(getvolcano)$/i;
handler.register = true;
handler.limit = true;

export default handler;