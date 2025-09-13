
const REFLECTION_PROMPTS = [
  "*🌱 REFLEKSI 1:* Rasakan aliran udara yang masuk melalui hidungmu saat ini",
  "*👁️ REFLEKSI 2:* Perhatikan detak jantungmu tanpa penilaian - seberapa cepat atau lambat?",
  "*🌼 REFLEKSI 3:* Sebutkan 3 aroma yang bisa kamu endus di sekitarmu",
  "*🖐️ REFLEKSI 4:* Sentuh sebuah benda dekatmu - deskripsikan teksturnya secara detail",
  "*🌞 REFLEKSI 5:* Tutup matamu dan rasakan sinar matahari/ruangan di kulitmu",
  "*🍽️ REFLEKSI 6:* Ingat makanan terakhirmu - coba rasakan kembali aromanya",
  "*🚶 REFLEKSI 7:* Perhatikan cara berjalanmu - bagian kaki mana yang pertama menyentuh tanah?",
  "*💧 REFLEKSI 8:* Minum segelas air perlahan - fokus pada sensasi di tenggorokan",
  "*🌙 REFLEKSI 9:* Ingat momen paling tenang minggu ini - dimana dan kapan itu terjadi?",
  "*🎶 REFLEKSI 10:* Dengarkan suara sekitar - bisakah kamu mengidentifikasi 3 sumber suara berbeda?"
];

const SENSORY_EXERCISES = [
  "*👃 LATIHAN INDRA PENCIUMAN:* Cium rempah/bunga terdekat - fokus pada aromanya selama 30 detik",
  "*👂 LATIHAN PENDENGARAN:* Dengarkan suara terjauh yang bisa kamu dengar",
  "*👅 LATIHAN PENGECAP:* Kunyah perlahan dan catat perubahan rasa makanan",
  "*✋ LATIHAN PERABA:* Usap permukaan dengan suhu berbeda (dingin/panas/halus/kasar)",
  "*👀 LATIHAN PENGLIHATAN:* Pilih objek dan amati selama 1 menit tanpa berpikir"
];

const EMOTIONAL_CHECKINS = [
  "*😊 PERIKSA EMOSI:* Skala 1-10, seberapa bahagia dirimu sekarang?",
  "*😌 PERIKSA KETENANGAN:* Apa yang membuatmu merasa damai hari ini?",
  "*😠 PERIKSA KEMARAHAN:* Adakah hal kecil yang mengganggumu tanpa disadari?",
  "*😨 PERIKSA KECEMASAN:* Di bagian tubuh mana kamu merasakan kecemasan?",
  "*😴 PERIKSA KELETIHAN:* Apakah energimu sudah terisi hari ini?"
];

const GRATITUDE_PROMPTS = [
  "*🙏 RASA SYUKUR:* Siapa 1 orang yang paling ingin kamu ucapkan terima kasih?",
  "*🌻 APRESIASI DIRI:* Apa 1 hal kecil yang berhasil kamu lakukan hari ini?",
  "*💝 HADIAH KECIL:* Nikmati hadiah sederhana yang sering kamu anggap remeh",
  "*🌈 KEINDAHAN:* Apresiasi sesuatu yang indah yang kamu lihat hari ini",
  "*🤲 KEMURAHAN:* Ingat momen terakhir ketika seseorang membantumu"
];

const ADDITIONAL_GUIDANCE = [
  "\n\n*💫 TIP:* Lakukan dengan mata tertutup untuk fokus lebih dalam",
  "\n\n*📝 CATATAN:* Tidak perlu terburu-buru menjawab",
  "\n\n*⏳ DURASI:* Luangkan 2-3 menit untuk setiap refleksi",
  "\n\n*🔄 VARIASI:* Coba posisi duduk/berdiri berbeda",
  "\n\n*🌿 LINGKUNGAN:* Temukan tempat yang tenang jika memungkinkan"
];

let handler = async (m, { conn, usedPrefix }) => {
  const category = Math.floor(Math.random() * 4);
  let randomPrompt, randomGuidance;
  
  switch(category) {
    case 0:
      randomPrompt = REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)];
      break;
    case 1:
      randomPrompt = SENSORY_EXERCISES[Math.floor(Math.random() * SENSORY_EXERCISES.length)];
      break;
    case 2:
      randomPrompt = EMOTIONAL_CHECKINS[Math.floor(Math.random() * EMOTIONAL_CHECKINS.length)];
      break;
    case 3:
      randomPrompt = GRATITUDE_PROMPTS[Math.floor(Math.random() * GRATITUDE_PROMPTS.length)];
      break;
  }
  
  randomGuidance = ADDITIONAL_GUIDANCE[Math.floor(Math.random() * ADDITIONAL_GUIDANCE.length)];
  
  const message = 
    `*🧠 LATIHAN KESADARAN PENUH*\n\n` +
    `${randomPrompt}` +
    `${randomGuidance}\n\n` +
    `*🔄 Gunakan* ${usedPrefix}${handler.command[0]} *untuk latihan berbeda*\n` +
    `*📚 Kategori:* ${["Refleksi Diri", "Latihan Indra", "Cek Emosi", "Rasa Syukur"][category]}`;

  await conn.sendMessage(m.chat, {
    text: message,
    contextInfo: {
      mentionedJid: [m.sender],
      forwardingScore: 999,
      isForwarded: true
    }
  }, { quoted: m });
};

handler.help = ['mindfulness'];
handler.command = ['mindfulness'];
handler.tags = ['quote'];
handler.limit = true;
handler.register = true;

export default handler;