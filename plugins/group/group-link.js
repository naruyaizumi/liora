let handler = async (m, { conn, groupMetadata }) => {
    try {
        let link = `https://chat.whatsapp.com/${await conn.groupInviteCode(m.chat)}`;
        let teks = `🍡 *Nama Grup: ${groupMetadata.subject}*
🍰 *ID Grup: ${m.chat}*

🍬 *Klik tombol di bawah untuk menyalin link grup dan bagikan ke temanmu!* 💌`;
        await conn.sendMessage(
            m.chat,
            {
                text: teks,
                title: "🍓 Link Undangan Grup",
                footer: "© Naruya Izumi 2024",
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🍩 Salin Link Grup",
                            copy_code: link,
                        }),
                    },
                ],
            },
            { quoted: m }
        );
    } catch (e) {
        console.error(e);
        m.reply(
            "🍪 *Gagal mengambil link grup, pastikan bot admin dan grup tidak dalam mode privat.*"
        );
    }
};

handler.help = ["grouplink"];
handler.tags = ["group"];
handler.command = /^(grouplink|link)$/i;
handler.group = true;
handler.botAdmin = true;

export default handler;
