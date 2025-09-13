
const BASE_URL = 'https://bukuacak-9bdcb4ef2605.herokuapp.com/api/v1/book';

let handler = async (m, { conn, usedPrefix, command, args }) => {
    await global.loading(m, conn);

    try {
        const bookName = args.join(' ');
        if (!bookName) {
            throw new Error('Nama buku tidak diberikan. Silakan masukkan nama buku.');
        }


        const response = await fetch(`${BASE_URL}?keyword=${encodeURIComponent(bookName)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });


        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const apiData = await response.json();
        const books = apiData.books || [];


        if (books.length === 0) {
            throw new Error('Tidak ada buku ditemukan dengan nama tersebut.');
        }


        const formattedBooks = books.map((book, index) => {
            return `📚 *${index + 1}. Judul:* ${book.title || 'Judul tidak tersedia'}\n▸ *ID Buku:* ${book._id}`;
        }).join('\n\n━━━━━━━━━━━━━━\n\n');


        await conn.reply(m.chat, 
            `📚 *DAFTAR BUKU YANG DITEMUKAN*\n\n${formattedBooks}\n\nSilakan pilih ID buku yang ingin Anda ambil.`, 
            m
        );

    } catch (error) {
        console.error('Error fetching books:', error);
        
        let errorMessage = '⚠ *GAGAL MENGAMBIL BUKU*\n\n';
        
        if (error.message.includes('404')) {
            errorMessage += '*Halaman tidak ditemukan.* Coba dengan nama buku yang berbeda.';
        } else if (error.message.includes('500')) {
            errorMessage += '*Kesalahan server.* Coba lagi nanti.';
        } else {
            errorMessage += `*Error:* ${error.message}`;
        }
        
        await conn.reply(m.chat, errorMessage, m);
    }
};

handler.help = ['getbuku <nama buku>'];
handler.tags = ['search'];
handler.command = /^(getbuku)$/i;
handler.register = true;
handler.limit = true;

export default handler;