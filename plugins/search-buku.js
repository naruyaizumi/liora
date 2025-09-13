
const BASE_URL = 'https://bukuacak-9bdcb4ef2605.herokuapp.com/api/v1/book';

let handler = async (m, { conn, usedPrefix, command, args }) => {
    await global.loading(m, conn);

    try {
        let sort = 'newest';
        let page = 1;
        let year = '';
        let genre = '';
        let keyword = '';


        if (args.length > 0) {
            sort = args[0] || sort;
            page = args[1] && !isNaN(args[1]) ? parseInt(args[1]) : page;
            year = args[2] || year;
            genre = args[3] || genre;
            keyword = args[4] || keyword;
        }


        const queryParams = new URLSearchParams({
            sort,
            page,
            year,
            genre,
            keyword
        }).toString();


        const response = await fetch(`${BASE_URL}?${queryParams}`, {
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
            throw new Error('Tidak ada buku ditemukan dengan kriteria tersebut.');
        }


        const formattedBooks = books.slice(0, 5).map((book, index) => {
            return `
📚 ${index + 1}. *${book.title || 'Judul tidak tersedia'}*
▸ *Penulis:* [${book.author.name || 'Unknown'}](${book.author.url || '#'})
▸ *Kategori:* [${book.category.name || 'N/A'}](${book.category.url || '#'})
▸ *Ringkasan:* ${book.summary || 'N/A'}
▸ *Harga:* ${book.details.price ? `Rp ${book.details.price}` : 'N/A'}
▸ *Tanggal Terbit:* ${book.details.published_date || 'N/A'}
▸ *Total Halaman:* ${book.details.total_pages || 'N/A'}
🔗 *Beli di:* [${book.buy_links[0]?.store || 'Link tidak tersedia'}](${book.buy_links[0]?.url || '#'})
            `.trim();
        }).join('\n\n━━━━━━━━━━━━━━\n\n');


        await conn.reply(m.chat, 
            `📚 *DAFTAR BUKU - HALAMAN ${page}*\n\n${formattedBooks}\n\nGunakan *${usedPrefix}${command} <sort> <page> <year> <genre> <keyword>* untuk filter lainnya`, 
            m, {
                contextInfo: {
                    externalAdReply: {
                        title: `Buku - Page ${page}`,
                        body: "Temukan buku yang sesuai dengan kriteria Anda",
                        thumbnailUrl: books[0]?.cover_image || "https://i.imgur.com/5XrJYdD.jpg",
                        sourceUrl: books[0]?.buy_links[0]?.url || 'Link tidak tersedia',
                        mediaType: 1
                    }
                }
            }
        );

    } catch (error) {
        console.error('Error fetching books:', error);
        
        let errorMessage = '⚠ *GAGAL MENGAMBIL BUKU*\n\n';
        
        if (error.message.includes('404')) {
            errorMessage += '*Halaman tidak ditemukan.* Coba nomor halaman yang lebih kecil.';
        } else if (error.message.includes('500')) {
            errorMessage += '*Kesalahan server.* Coba lagi nanti.';
        } else {
            errorMessage += `*Error:* ${error.message}`;
        }
        
        await conn.reply(m.chat, errorMessage, m, {
            contextInfo: {
                externalAdReply: {
                    title: "Error System",
                    body: "Buku tidak tersedia",
                    thumbnailUrl: "https://i.imgur.com/8Km9tLL.png"
                }
            }
        });
    }
};

handler.help = ['buku <sort> <page> <year> <genre> <keyword>'];
handler.tags = ['search'];
handler.command = /^(buku|book)$/i;
handler.register = true;
handler.limit = true;

export default handler;