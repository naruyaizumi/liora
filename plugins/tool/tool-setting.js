let features = [
  { key: "adminOnly", scope: "chat", name: "Admin Only" },
  { key: "detect", scope: "chat", name: "Detect" },
  { key: "notifgempa", scope: "chat", name: "Notif Gempa" },
  { key: "antiLinks", scope: "chat", name: "Anti Link" },
  { key: "antiSticker", scope: "chat", name: "Anti Sticker" },
  { key: "antiAudio", scope: "chat", name: "Anti Audio" },
  { key: "antiFile", scope: "chat", name: "Anti File" },
  { key: "antiFoto", scope: "chat", name: "Anti Foto" },
  { key: "antiVideo", scope: "chat", name: "Anti Video" },
  { key: "autoApprove", scope: "chat", name: "Auto Approve" },

  { key: "self", scope: "bot", name: "Self Mode" },
  { key: "gconly", scope: "bot", name: "Group Only" },
  { key: "queque", scope: "bot", name: "Antrian Pesan" },
  { key: "noprint", scope: "bot", name: "No Print" },
  { key: "autoread", scope: "bot", name: "Auto Read" },
  { key: "restrict", scope: "bot", name: "Restrict" },
  { key: "cleartmp", scope: "bot", name: "Clear Tmp File" },
  { key: "anticall", scope: "bot", name: "Anti Call" },
  { key: "adReply", scope: "bot", name: "Ad Reply Mode" },
  { key: "noerror", scope: "bot", name: "Hide Error Mode" },
];

function listFeatures(isOwner, chat, bot) {
  let available = isOwner
    ? features
    : features.filter((f) => f.scope === "chat");
  return available
    .map((f, i) => {
      let aktif = f.scope === "chat" ? chat[f.key] : bot[f.key];
      return `*${i + 1}. ${f.name} [${aktif ? "ON 🍃" : "OFF 🍂"}]*`;
    })
    .join("\n");
}

let handler = async (
  m,
  { conn, isOwner, isAdmin, args, usedPrefix, command },
) => {
  let chat = global.db.data.chats[m.chat];
  let bot = global.db.data.settings[conn.user.jid] || {};

  if (!args[0]) {
    let daftar = listFeatures(isOwner, chat, bot);
    return m.reply(
      `🍱 *Daftar Fitur:*\n${daftar}\n\n*Contoh: • ${usedPrefix + command} 1 2 3  (aktifkan fitur 1,2,3)*\n*• ${usedPrefix + (command === "on" ? "off" : "on")} 4 5  (nonaktifkan fitur 4,5)*`,
    );
  }

  let enable = command === "on";
  let indexes = args.map((n) => parseInt(n)).filter((n) => !isNaN(n));

  if (!indexes.length) return m.reply("🔥 *Nomor fitur tidak valid!*");

  let results = [];
  for (let i of indexes) {
    let fitur = (
      isOwner ? features : features.filter((f) => f.scope === "chat")
    )[i - 1];
    if (!fitur) continue;

    if (fitur.scope === "chat") {
      if (!(isAdmin || isOwner)) continue;
      chat[fitur.key] = enable;
    } else if (fitur.scope === "bot") {
      if (!isOwner) continue;
      bot[fitur.key] = enable;
    }
    results.push(`*${fitur.name} : ${enable ? "ON 🍃" : "OFF 🍂"}*`);
  }

  if (!results.length) return m.reply("🔥 *Tidak ada fitur yang bisa diubah.*");
  return m.reply("🍡 *Hasil:*\n" + results.join("\n"));
};

handler.help = ["on", "off"];
handler.tags = ["tools"];
handler.command = /^(on|off)$/i;
handler.group = true;

export default handler;
