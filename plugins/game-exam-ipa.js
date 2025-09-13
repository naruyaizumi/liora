
import pkg from 'baileys'

const { proto } = pkg

let handler = async (m, { conn, text, command, usedPrefix }) => {
let M = proto.WebMessageInfo;
let chats = db.data.chats[m.chat];
let msgs = chats.listStr || {};

let data = [
{
soal: "Perhatikan tabel berikut!\n\n1. Cumi-cumi > Memancarkan cahaya\n2. Trenggiling > Mengeluarkan bau menyengat\n3. Ikan Lele > Memiliki misai\n4. Burung Pelatuk > Paruh runcing dan melengkung\n\nPasangan nama hewan dan cara adaptasi yang benar ditunjukkan nomor? ….\n\na 1 dan\nb 1 dan 3\nc 2 dan 3\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'b'               
},
{
soal: "Gaya yang bekerja pada ban sepeda yang sedang direm adalah ....\n\na gesek\nb pegas\nc gravitasi\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'a'                
},
{
soal: "Berikut adalah salah satu ciri khas benda yang mengapung di air, kecuali ....\n\na massa jenis benda lebih kecil dari massa jenis air\nb volume benda lebih kecil dari volume air yang dipindahkan\n c berat benda lebih kecil dari berat air yang dipindahkan\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'c'                
},
{
soal: "Gaya yang bekerja pada benda saat jatuh bebas adalah ....\n\na gaya gesek\nb gaya gravitasi\nc gaya pegas\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'b'                
},
// Soal 5
{
soal: "Salah satu ciri cahaya adalah ....\n\na tidak dapat dibiaskan\nb dapat dipantulkan\nc tidak memiliki kecepatan\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'b'                
},
// Soal 6
{
soal: "Planet manakah yang memiliki warna merah?\n\na Merkurius\nb Venus\nc Bumi\nd Mars\ne Jupiter\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'd'                
},
// Soal 7
{
soal: "Kegiatan berikut yang tidak termasuk gerak melingkar adalah ....\n\na bola basket yang berputar di jari\nb kipas angin yang berputar\n c menarik pegas jam dinding\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'c'                
},
// Soal 8
{
soal: "Planet yang mempunyai waktu revolusi terpendek adalah ....\n\na Merkurius\nb Venus\nc Bumi\nd Mars\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'a'                
},
// Soal 9
{
soal: "Gambar tersebut menunjukkan pesawat yang sedang ....\n\na mendarat\nb terbang\nc menyambar petir\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'a'                
},
// Soal 10
{
soal: "Benda yang dipengaruhi gaya gravitasi akan jatuh menuju pusat bumi karena ....\n\na adanya medan gravitasi yang ada di bumi\nb adanya medan gravitasi yang ada di benda\nc adanya medan gravitasi yang ada di langit\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'a'                
},
// Soal 11
{
soal: "Berikut adalah salah satu sifat cahaya, kecuali ....\n\na memantul\nb merambat\nc berat\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'c'                
},
// Soal 12
{
soal: "Cara yang paling aman untuk menyeberangi sungai tersebut adalah dengan menggunakan ....\n\na rakit\nb perahu motor\nc jembatan",
jawaban: 'c'                
},
// Soal 13
{
soal: "Berikut adalah salah satu manfaat gravitasi bagi manusia, kecuali ....\n\na menjaga agar manusia tetap berada di bumi\nb membantu dalam melakukan gerak\n c menjadikan manusia dapat terbang\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'c'                
},
// Soal 14
{
soal: "Kegiatan yang digambarkan oleh gambar di atas adalah ....\n\na memasak\nb mendayung\nc membaca buku\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'b'                
},
// Soal 15
{
soal: "Benda yang memiliki massa jenis lebih besar dari massa jenis air akan ....\n\na tenggelam\nb mengapung\nc berada di atas permukaan air\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'a'                
},
// Soal 16
{
soal: "Objek yang sedang diperlihatkan pada gambar di atas adalah ....\n\na balon\nb kapal laut\nc pesawat terbang\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'b'                
},
// Soal 17
{
soal: "Fungsi pegas dalam gambar ini adalah ....\n\na memberikan hawa sejuk\nb memberikan kemudahan membuka pintu\nc memberikan gaya pada pintu agar tertutup kembali\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'c'                
},
// Soal 18
{
soal: "Benda yang mengapung pada air akan mengalami gaya ....\n\na tegangan\nb tekanan\nc apung\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'c'                
},
// Soal 19
{
soal: "Planet manakah yang memiliki jumlah bulan terbanyak?\n\na Merkurius\nb Venus\nc Bumi\nd Mars\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'd'                
},
// Soal 20
{
soal: "Alat musik yang dimainkan dengan cara dipukul adalah ....\n\na piano\nb biola\nc gitar\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'a'                
},
// Soal 21
{
soal: "Fungsi benda yang digambarkan pada gambar di atas adalah ....\n\na menggoreng\nb mengukur\n c mencampur\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'b'                
},
// Soal 22
{
soal: "Salah satu manfaat gravitasi adalah ....\n\na menjaga bumi agar tetap mengelilingi matahari\nb menjaga agar manusia tetap berada di bumi\nc menjaga agar air tetap mengalir ke laut\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'b'                
},
// Soal 23
{
soal: "Kegiatan yang sedang dilakukan oleh orang yang terlihat pada gambar di atas adalah ....\n\na berenang\nb menari\nc membaca buku\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'a'                
},
// Soal 24
{
soal: "Saat benda ditendang, benda akan ....\n\na berhenti\nb mengubah gerak\n c mengalami gerak\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'c'                
},
// Soal 25
{
soal: "Alat musik yang digambarkan oleh gambar di atas adalah ....\n\na gitar\nb drum\nc biola\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'b'                
},
// Soal 26
{
soal: "Dalam suatu gaya dorong, gaya yang bekerja adalah ....\n\na gaya magnet\nb gaya gesek\nc gaya tekan\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'c'                
},
// Soal 27
{
soal: "Benda yang terlihat pada gambar di atas adalah ....\n\na kursi\nb meja\nc lemari\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'b'                
},
{
soal: "Manfaat gravitasi bagi manusia adalah ....\n\na menjaga agar manusia tetap berada di bumi\nb menjaga agar manusia bisa terbang\nc menjaga agar manusia tetap terapung di air\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'a'                
},
{
soal: "Benda yang digambarkan oleh gambar di atas adalah ....\n\na jam dinding\nb kulkas\nc lemari\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'a'                
},
{
soal: "Tujuan dari penggunaan alat yang digambarkan pada gambar di atas adalah ....\n\na untuk mengukur suhu\nb untuk membersihkan kaca\nc untuk menulis\n\n_untuk menjawab ketik .exipa ab/c_",
jawaban: 'c'                
},
];
switch (command) {
case 'examipa':
let randomIndex = Math.floor(Math.random() * data.length);
let randomSoal = data[randomIndex].soal;
conn.reply(m.chat, randomSoal, m);
break;

case 'exipa':
let userAnswer = text.toLowerCase();
let randomIndexEx = Math.floor(Math.random() * data.length); 
let correctAnswer = data[randomIndexEx].jawaban;
if (userAnswer === correctAnswer) {
conn.reply(m.chat, '*Jawaban Anda benar!* 🎉', m);
} else {
conn.reply(m.chat, '*Jawaban Anda salah.* 😔', m);
}
break;

default:
throw `Perintah tidak valid: ${command}`;
}
}

handler.tags = ['game'];
handler.command = /^(examipa|exipa)$/i;
handler.help = ['examIpa'];
handler.register = true
export default handler;