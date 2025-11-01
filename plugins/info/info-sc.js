let handler = async (m, { conn }) => {
  const text = `
Liora Repository

Project Script Izumi
Repository: https://github.com/naruyaizumi/liora
Report Bug: https://github.com/naruyaizumi/liora/issues
Pull Req: https://github.com/naruyaizumi/liora/pulls

© 2024 – 2025 Naruya Izumi • All Rights Reserved
    `.trim();
  const vcard = `BEGIN:VCARD
VERSION:3.0
N:;ttname;;;
FN:ttname
item1.TEL;waid=13135550002:+1 (313) 555-0002
item1.X-ABLabel:Ponsel
END:VCARD`;
  
  const q = {
    key: {
      fromMe: false,
      participant: "13135550002@s.whatsapp.net",
      remoteJid: "status@broadcast",
    },
    message: {
      contactMessage: {
        displayName: "𝗟 𝗜 𝗢 𝗥 𝗔",
        vcard,
      },
    },
  };
  await conn.sendMessage(m.chat, {
    product: {
      productImage: {
        url: "https://qu.ax/WGRQE.jpg"
      },
      productId: "32409523241994909",
      title: "mkfs.ext4 /dev/naruyaizumi",
      description: "",
      currencyCode: "IDR",
      priceAmount1000: String((23 * 2 ** 32) + 1215752192),
      retailerId: "IZUMI",
      url: "https://linkbio.co/naruyaizumi",
      productImageCount: 5,
      signedUrl: "https://l.wl.co/l/?u=https%3A%2F%2Flinkbio.co%2Fnaruyaizumi&e=AT065QDZzUpFex4H3JaKX1B3jFxLs90G3NEOHbP-LeDGmNM4QfwzF76CAPV6ODSxeErfWu-ZjaaihkWeRUJcUKOdiAfCTnSh3v8uQMqc2-eqKvM8EYzip2AAR-5GsbNJH16tEQ"
    },
    businessOwnerJid: "113748182302861@lid",
    footer: text,
    contextInfo: {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363417411850319@newsletter",
        newsletterName: "mkfs.ext4 /dev/naruyaizumi"
      },
    },
  }, { quoted: q });
};

handler.help = ["script"];
handler.tags = ["info"];
handler.command = /^(script|sc)$/i;

export default handler;


await conn.sendMessage(
    m.chat, 
    { 
       image: {
          url: 'https://qu.ax/WGRQE.jpg'
       },    
       caption: 'Body',
       title: 'Title', 
       subtitle: 'Subtitle', 
       footer: 'Footer',
       shop: {
          surface: 1, // 2 | 3 | 4
          id: 'https://example.com'
       }, 
       hasMediaAttachment: true,
    }
)
