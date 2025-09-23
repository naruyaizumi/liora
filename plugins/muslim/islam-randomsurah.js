let handler = async (m, { conn }) => {
    try {
        await global.loading(m, conn);
        let response = await fetch("https://cloudku.us.kg/api/murotal/random/surah");
        if (!response.ok) return m.reply("𝙂𝙖𝙜𝙖𝙡 𝙢𝙚𝙣𝙜𝙝𝙪𝙗𝙪𝙣𝙜𝙞 𝘼𝙋𝙄. 𝘾𝙤𝙗𝙖 𝙡𝙖𝙜𝙞 𝙣𝙖𝙣𝙩𝙞 𝙮𝙖!");
        let json = await response.json();
        if (!json.status || json.status !== "success" || !json.result)
            return m.reply("𝙂𝙖𝙜𝙖𝙡 𝙢𝙚𝙢𝙥𝙧𝙤𝙨𝙚𝙨 𝙥𝙚𝙧𝙢𝙞𝙣𝙩𝙖𝙖𝙣! 𝘾𝙤𝙗𝙖 𝙡𝙖𝙜𝙞.");
        let { 
            audio_url, 
            name_en, 
            name_id, 
            name_long, 
            number, 
            number_of_verses, 
            revelation_id, 
            tafsir, 
            translation_id 
        } = json.result;
        
        let caption = `𝗦𝘂𝗿𝗮𝗵 ${name_en} (${name_id})
${name_long}
𝗡𝗼𝗺𝗼𝗿: ${number}
𝗝𝘂𝗺𝗹𝗮𝗵 𝗔𝘆𝗮𝘁: ${number_of_verses}
𝗧𝘂𝗿𝘂𝗻: ${revelation_id}
𝗔𝗿𝘁𝗶: ${translation_id}

${tafsir}

𝗗𝗶𝗯𝘂𝗮𝘁 𝗼𝗹𝗲𝗵 𝗔𝗹𝗳𝗶𝗱𝗲𝘃 𝗴𝗶𝘁𝗵𝘂𝗯/𝗰𝗹𝗼𝘂𝗱𝗸𝘂𝗶𝗺𝗮𝗴𝗲𝘀`;

        await conn.sendFile(m.chat, audio_url, `${name_en}.mp3`, caption, m, true, {
            mimetype: "audio/mpeg",
            contextInfo: {
                externalAdReply: {
                    title: `${name_en} - ${name_id}`,
                    body: `𝗦𝘂𝗿𝗮𝗵 ${number} | ${number_of_verses} 𝗔𝘆𝗮𝘁`,
                    mediaType: 2,
                    thumbnailUrl: "https://files.cloudkuimages.guru/images/e63c51e0ec8b.jpg",
                    renderLargerThumbnail: true,
                },
            },
        });
    } catch (e) {
        console.error(e);
        return m.reply("𝗧𝗲𝗿𝗷𝗮𝗱𝗶 𝗸𝗲𝘀𝗮𝗹𝗮𝗵𝗮𝗻 𝘀𝗮𝗮𝘁 𝗺𝗲𝗺𝗽𝗿𝗼𝘀𝗲𝘀 𝗽𝗲𝗿𝗺𝗶𝗻𝘁𝗮𝗮𝗻.");
    } finally {
        await global.loading(m, conn, true);
    }
};
handler.help = ["randomsurah"];
handler.tags = ["islamic"];
handler.command = /^(randomsurah|surahacak)$/i;
export default handler;