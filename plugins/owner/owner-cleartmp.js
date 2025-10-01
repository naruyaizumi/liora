import { readdirSync, rmSync } from "fs";

let handler = async (m) => {
    const dir = "./tmp";
    readdirSync(dir).forEach((f) => rmSync(`${dir}/${f}`));
    await m.reply(`🍩 *Folder tmp sudah berhasil dibersihkan~* 🍰\n🍓 *Sekarang jadi lebih rapi*`);
};

handler.help = ["cleartmp"];
handler.tags = ["owner"];
handler.command = /^(c(lear)?tmp)$/i;
handler.mods = true;

export default handler;
