
let handler = async (m, { args, conn }) => {
  if (!args[0]) return m.reply('*❌ Mohon isi request fitur!*\n*Contoh:* .req Fitur download video TikTok')

  try {
    const text = args.join(' ')
    const formattedText = `*📝 Request Fitur Baru*\n\n` +
                         `*💡 Permintaan:* ${text}\n` +
                         `*👤 Dari:* @${m.sender.split('@')[0]}\n` +
                         `*📅 Tanggal:* ${new Date().toLocaleString()}`


    const url = 'https://flowfalcon.dpdns.org/imagecreator/ngl?title=Request+Feature&text=' + 
                encodeURIComponent(text) +
                '&theme=dark'


    await conn.sendMessage('6281398961382@s.whatsapp.net', { 
      image: { url },
      caption: formattedText,
      mentions: [m.sender]
    }).catch(e => {
      console.error('Failed to send to owner:', e)
      throw new Error('Gagal mengirim ke developer')
    })


    return m.reply(`*✨ Request Terkirim!*\n\n` +
                   `Permintaan fitur *"${text}"* sudah dikirim ke developer.\n` +
                   `Semoga bisa segera diwujudkan ya! 🤞\n\n` +
                   `_Terima kasih atas kontribusinya!_`)
    
  } catch (error) {
    console.error('Request Error:', error)
    return m.reply(`*❌ Gagal Mengirim Request*\n` +
                   `Error: ${error.message}\n\n` +
                   `Coba lagi nanti atau hubungi developer langsung.`)
  }
}


handler.help = ['req <teks>'];
handler.tags = ['tools'];
handler.command = /^req?$/i
handler.limit = true;
handler.register = true;

export default handler;