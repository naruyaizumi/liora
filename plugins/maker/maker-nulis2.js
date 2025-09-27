import { writeOnPaper } from "../../lib/write.js";

let handler = async (m, { conn, args }) => {
    try {
        await global.loading(m, conn);
        let teks = args.join` `;
        let buffer = await writeOnPaper({
            imageUrl: "https://i.ibb.co.com/DDQqwvYY/magernulis1.jpg",
            text: teks,
            color: "blue",
        });
        await conn.sendFile(m.chat, buffer, "nulis.jpg", "🍓 *Hati² ketahuan:v* 🍩", m);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["nulis2"];
handler.tags = ["nulis"];
handler.command = /^(nulis2)$/i;

export default handler;
