
const levelSigma = [
    { 
        level: 0, 
        judul: "🐑 Orang Biasa", 
        deskripsi: "Kamu sangat terikat dengan norma sosial",
        ciri: [
            "Ikut-ikutan tren terkini",
            "Butuh validasi orang lain",
            "Hindari konflik dan risiko"
        ],
        emoji: "▱▱▱▱▱▱▱▱▱▱"
    },
    {
        level: 1,
        judul: "👶 Calon Sigma",
        deskripsi: "Mulai menunjukkan tanda-tanda sigma",
        ciri: [
            "Mulai mempertanyakan norma",
            "Belajar mandiri secara finansial",
            "Mulai selektif dalam pertemanan"
        ],
        emoji: "▰▱▱▱▱▱▱▱▱▱"
    },
    {
        level: 2,
        judul: "🕵️‍♂️ Sigma Pemula", 
        deskripsi: "Sudah punya ciri khas sigma dasar",
        ciri: [
            "Pola pikir independen",
            "Fokus pengembangan diri",
            "Tidak takut berbeda pendapat"
        ],
        emoji: "▰▰▱▱▱▱▱▱▱▱"
    },
    {
        level: 3,
        judul: "🐺 Serigala Sendiri",
        deskripsi: "Nyaman dengan kesendirian",
        ciri: [
            "Batas diri yang jelas",
            "Gaya hidup unik dan tak biasa",
            "Tidak tergantung validasi sosial"
        ],
        emoji: "▰▰▰▱▱▱▱▱▱▱"
    },
    {
        level: 4,
        judul: "🧠 Sigma Strategis",
        deskripsi: "Ahli membaca situasi sosial",
        ciri: [
            "Tindakan terencana matang",
            "Kontrol emosi sangat baik",
            "Manipulasi sosial halus"
        ],
        emoji: "▰▰▰▰▱▱▱▱▱▱"
    },
    {
        level: 5,
        judul: "🗿 Sigma Sejati",
        deskripsi: "Pola pikir mandiri sepenuhnya",
        ciri: [
            "Tak butuh pengakuan siapapun",
            "Self-sufficient secara mental",
            "Prioritas tujuan pribadi"
        ],
        emoji: "▰▰▰▰▰▱▱▱▱▱"
    },
    {
        level: 6,
        judul: "👑 Raja Sigma",
        deskripsi: "Kharisma alami tanpa usaha",
        ciri: [
            "Orang lain mengejar validasimu",
            "Pengaruh tanpa disadari",
            "Dianggap misterius"
        ],
        emoji: "▰▰▰▰▰▰▱▱▱▱"
    },
    {
        level: 7,
        judul: "🧙‍♂️ Sigma Bijak",
        deskripsi: "Melampaui hierarki sosial",
        ciri: [
            "Ketenangan bak samudra",
            "Pengamat manusia ulung",
            "Kebijaksanaan sejati"
        ],
        emoji: "▰▰▰▰▰▰▰▱▱▱"
    },
    {
        level: 8,
        judul: "💎 Sigma Legenda",
        deskripsi: "Memiliki aura mistis",
        ciri: [
            "Kehadiran yang terasa",
            "Orang membuat mitos tentangmu",
            "Misteri tak terbantahkan"
        ],
        emoji: "▰▰▰▰▰▰▰▰▱▱"
    },
    {
        level: 9,
        judul: "🌌 Sigma Kosmik",
        deskripsi: "Melampaui pemahaman manusia",
        ciri: [
            "Realitas terbentuk di sekitarmu",
            "Dianggap sebagai mitos",
            "Kehadiran bak dewa"
        ],
        emoji: "▰▰▰▰▰▰▰▰▰▰"
    }
];

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        await conn.sendPresenceUpdate('composing', m.chat);


        const loadingMsg = await conn.reply(m.chat, 
            `*${pickRandom(['🔮', '🌠', '⚡', '🌀'])} Menganalisis kepribadianmu...*\n` +
            `0% ▱▱▱▱▱▱▱▱▱▱ 100%`, 
        m);


        for (let i = 10; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 200));
            await conn.relayMessage(m.chat, {
                protocolMessage: {
                    key: loadingMsg.key,
                    type: 14,
                    editedMessage: {
                        conversation: `*${pickRandom(['🔮', '🌠', '⚡', '🌀'])} Menganalisis kepribadianmu...*\n` +
                                     `${i}% ${'▰'.repeat(i/10)}${'▱'.repeat(10-(i/10))} 100%`
                    }
                }
            }, {});
        }


        const skorSigma = getSigmaScore();
        const hasil = levelSigma[skorSigma];


        const hasilTes = formatResult(m.sender, skorSigma, hasil);


        const thumbnail = await getThumbnail();


        await conn.sendMessage(m.chat, {
            text: hasilTes,
            mentions: [m.sender],
            contextInfo: {
                externalAdReply: {
                    title: `📊 Level Sigma: ${skorSigma}/9`,
                    body: `${hasil.judul}`,
                    thumbnail: thumbnail,
                    mediaType: 1,
                    sourceUrl: 'https://wa.me/' + conn.user.jid.split('@')[0]
                }
            }
        }, { quoted: m });

    } catch (error) {
        console.error('Error:', error);
        await conn.reply(m.chat, 
            `*❌ Gagal menganalisis kepribadian sigma*\n` +
            `Error: ${error.message}\n\n` +
            `Coba lagi nanti atau laporkan ke developer!`, 
        m);
    }
};


function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function getSigmaScore() {

    const rand = Math.floor(Math.random() * 100);
    if (rand < 15) return 0;
    if (rand < 30) return 1;
    if (rand < 50) return 2; 
    if (rand < 65) return 3;
    if (rand < 75) return 4;
    if (rand < 85) return 5;
    if (rand < 90) return 6;
    if (rand < 95) return 7;
    if (rand < 99) return 8;
    return 9;
}

function formatResult(sender, score, data) {
    return `
*💫 HASIL TES SIGMA TERPERCAYA 💫*

👤 *User:* @${sender.split('@')[0]}
⭐ *Level Sigma:* ${score}/9
🎯 *Kategori:* ${data.judul}
📈 *Progress:* ${data.emoji}

📌 *Deskripsi:*
"${data.deskripsi}"

✨ *Ciri Khas:*
${data.ciri.map((trait, i) => `${i+1}. ${trait}`).join('\n')}

🔍 *Analisis Psikologis:*
${getPsychologicalAnalysis(score)}

📅 *Tanggal Tes:* ${new Date().toLocaleString('id-ID')}
`.trim();
}

function getPsychologicalAnalysis(level) {
    const analyses = [
        "Perlu banyak pengembangan diri",
        "Mulai menunjukkan potensi sigma",
        "Memiliki dasar kepribadian yang baik",
        "Sudah di jalur yang tepat",
        "Kemampuan sosial strategis yang baik",
        "Kepribadian mandiri yang kuat",
        "Kharisma alami yang jarang dimiliki",
        "Kebijaksanaan di atas rata-rata",
        "Level legendaris yang sangat langka",
        "Hanya 0.1% populasi mencapai level ini"
    ];
    return analyses[level];
}

async function getThumbnail() {
    try {

        const onlineThumbnail = await axios.get('https://i.imgur.com/JrXqQ6W.jpg', { 
            responseType: 'arraybuffer' 
        });
        return onlineThumbnail.data;
    } catch {
        try {
            return fs.readFileSync('./media/sigma.jpg');
        } catch {

            return Buffer.alloc(0);
        }
    }
}

handler.help = ['ceksigma'];
handler.tags = ['fun'];
handler.command = /^(ceksigma|testsigma|sigmalvl|sigma)$/i;
handler.limit = true;
handler.register = true;;

export default handler;