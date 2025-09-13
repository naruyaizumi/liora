
const BASE_URL = 'https://bukuacak-9bdcb4ef2605.herokuapp.com/api/v1/random_book';

let handler = async (m, { conn, usedPrefix, command, args }) => {
    await global.loading(m, conn);

    try {
        let year = '';
        let genre = '';
        let keyword = '';


        if (args.length > 0) {
            year = args[0] || year;
            genre = args[1] || genre;
            keyword = args[2] || keyword;
        }


        const queryParams = new URLSearchParams({
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

        const bookData = await response.json();


        if (bookData.message) {
            throw new Error(bookData.message);
        }


        const formattedBook = `
📚 *Judul:* ${bookData.title || 'Judul tidak tersedia'}
▸ *Penulis:* [${bookData.author.name || 'Unknown'}](${bookData.author.url || '#'})
▸ *Kategori:* ${bookData.category.name || 'N/A'}
▸ *Ringkasan:* ${bookData.summary || 'N/A'}
▸ *Harga:* ${bookData.details.price ? `Rp ${bookData.details.price}` : 'N/A'}
▸ *Tanggal Terbit:* ${bookData.details.published_date || 'N/A'}
▸ *Total Halaman:* ${bookData.details.total_pages || 'N/A'}
🔗 *Beli di:* [${bookData.buy_links[0]?.store || 'Link tidak tersedia'}](${bookData.buy_links[0]?.url || '#'})
        `.trim();


        await conn.reply(m.chat, 
            `📖 *BUKU ACAK*\n\n${formattedBook}`, 
            m, {
                contextInfo: {
                    externalAdReply: {
                        title: `Buku Acak: ${bookData.title}`,
                        body: "Informasi lengkap tentang buku ini",
                        thumbnailUrl: bookData.cover_image || "https://i.imgur.com/5XrJYdD.jpg",
                        sourceUrl: bookData.buy_links[0]?.url || 'Link tidak tersedia',
                        mediaType: 1
                    }
                }
            }
        );

    } catch (error) {
        console.error('Error fetching random book:', error);
        
        let errorMessage = '⚠ *GAGAL MENGAMBIL BUKU ACAK*\n\n';
        
        if (error.message.includes('404')) {
            errorMessage += '*Buku tidak ditemukan.* Coba dengan kriteria yang berbeda.';
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

handler.help = ['randombuku <year> <genre> <keyword>'];
handler.tags = ['search'];
handler.command = /^(randombuku)$/i;
handler.register = true;
handler.limit = true;

export default handler;