
let handler = async (m, { conn }) => {
let monsters = [
{ area: 1, name: "Kodama" },
{ area: 1, name: "Tanuki" },
{ area: 2, name: "Obake" },
{ area: 2, name: "Yamawaro" },
{ area: 3, name: "Kawa-no-Kami" },
{ area: 3, name: "Karasu-Tengu" },
{ area: 4, name: "Kamaitachi" },
{ area: 4, name: "Chōchin-obake" },
{ area: 5, name: "Yuki-onna" },
{ area: 5, name: "Kasa-obake" },
{ area: 6, name: "Ao-andon" },
{ area: 6, name: "Gashadokuro" },
{ area: 7, name: "Noppera-bō" },
{ area: 7, name: "Ittan-Momen" },
{ area: 8, name: "Tsukumogami" },
{ area: 8, name: "Bake-danuki" },
{ area: 9, name: "Yamabiko" },
{ area: 9, name: "Jorōgumo" },
{ area: 10, name: "Mokumokuren" },
{ area: 10, name: "Aka Manto" },
{ area: 11, name: "Inugami" },
{ area: 11, name: "Shiranui" },
{ area: 12, name: "Ushi-oni" },
{ area: 12, name: "Nurikabe" },
{ area: 13, name: "Tsuchinoko" },
{ area: 13, name: "Yamajijii" },
{ area: 14, name: "Umibōzu" },
{ area: 14, name: "Wanyūdō" },
{ area: 15, name: "Hitotsume-kozo" },
{ area: 15, name: "Yurei" },
{ area: 16, name: "Tesso" },
{ area: 16, name: "Enenra" },
{ area: 17, name: "Bakeneko" },
{ area: 17, name: "Nekomata" },
{ area: 18, name: "Kuchisake-onna" },
{ area: 18, name: "Tofu-kozō" },
{ area: 19, name: "Ame-onna" },
{ area: 19, name: "Amanojaku" },
{ area: 20, name: "Futakuchi-onna" },
{ area: 20, name: "Rokurokubi" },
{ area: 21, name: "Oni" },
{ area: 21, name: "Hebi-onna" },
{ area: 22, name: "Nue" },
{ area: 22, name: "Yatagarasu" },
{ area: 23, name: "Raijū" },
{ area: 23, name: "Suzaku" },
{ area: 24, name: "Kirin" },
{ area: 24, name: "Byakko" },
{ area: 25, name: "Shishi" },
{ area: 25, name: "Komainu" },
{ area: 26, name: "Kasha" },
{ area: 26, name: "Jikininki" },
{ area: 27, name: "Tenome" },
{ area: 27, name: "Yamawarawa" },
{ area: 28, name: "Gyūki" },
{ area: 28, name: "Hone-onna" },
{ area: 29, name: "Okuri-inu" },
{ area: 29, name: "Nurikabe" },
{ area: 30, name: "Yamato-no-Orochi" },
{ area: 31, name: "Aonyōbō" },
{ area: 32, name: "Shōjō" },
{ area: 33, name: "Kuda-gitsune" },
{ area: 34, name: "Kawa-uso" },
{ area: 35, name: "Kudan" },
{ area: 36, name: "Itachi" },
{ area: 37, name: "Jubokko" },
{ area: 38, name: "Kawa-no-Kami" },
{ area: 39, name: "Ungaikyo" },
{ area: 40, name: "Mōryō" },
{ area: 41, name: "Ubume" },
{ area: 42, name: "Ao-bozu" },
{ area: 43, name: "Yobuko" },
{ area: 44, name: "Kosode-no-te" },
{ area: 45, name: "Aobōzu" },
{ area: 46, name: "Tenjōname" },
{ area: 47, name: "Tōfu Kozō" },
{ area: 48, name: "Keukegen" },
{ area: 49, name: "Bura-bura" },
{ area: 50, name: "Hiderigami" },
{ area: 51, name: "Shirime" },
{ area: 52, name: "Mizuchi" },
{ area: 53, name: "Kamaitachi" },
{ area: 54, name: "Baku" },
{ area: 55, name: "Raijin" },
{ area: 56, name: "Fujin" },
{ area: 57, name: "Izanami" },
{ area: 58, name: "Amaterasu" },
{ area: 59, name: "Tsukuyomi" },
{ area: 60, name: "Susanoo" },
{ area: 61, name: "Tamamo-no-Mae" },
{ area: 62, name: "Seiryu" },
{ area: 63, name: "Genbu" },
{ area: 64, name: "Ryuujin" },
{ area: 65, name: "Hō-ō" },
{ area: 66, name: "Kujaku Myōō" },
{ area: 67, name: "Yasha" },
{ area: 68, name: "Ashura" },
{ area: 69, name: "Kagu-tsuchi" },
{ area: 70, name: "Izanagi" },
{ area: 71, name: "Kōjin" },
{ area: 72, name: "Jinmenju" },
{ area: 73, name: "Hōō" },
{ area: 74, name: "Hannya" },
{ area: 75, name: "Shinigami" },
{ area: 76, name: "Kurohime" },
{ area: 77, name: "Tatarigami" },
{ area: 78, name: "Shuten-dōji" },
{ area: 79, name: "Yomi-no-Kuni" },
{ area: 80, name: "Onryō" },
{ area: 81, name: "Aka Manto" },
{ area: 82, name: "Kanashibari" },
{ area: 83, name: "Goryō" },
{ area: 84, name: "Hanako-san" },
{ area: 85, name: "Toire no Hanako" },
{ area: 86, name: "Teke Teke" },
{ area: 87, name: "Aka Hōkō" },
{ area: 88, name: "Kubikajiri" },
{ area: 89, name: "Tōfu-kozō" },
{ area: 90, name: "Yamato-no-Maihime" },
{ area: 91, name: "Amefurikozō" },
{ area: 92, name: "Binbōgami" },
{ area: 93, name: "Zashiki-warashi" },
{ area: 94, name: "Kogarashi" },
{ area: 95, name: "Bishamon" },
{ area: 96, name: "Daikokuten" },
{ area: 97, name: "Hotei" },
{ area: 98, name: "Fukurokuju" },
{ area: 99, name: "Ebisu" },
{ area: 100, name: "Shinigami" }
]    
let player = global.db.data.users[m.sender]
let timeSinceLastHunt = new Date() - player.lasthunt
let cdMinutes = Math.floor(timeSinceLastHunt / 60000) % 60
let cdSeconds = Math.floor(timeSinceLastHunt / 1000) % 60
let remainingMinutes = Math.ceil(2 - cdMinutes)
let remainingSeconds = Math.ceil(60 - cdSeconds)

if (timeSinceLastHunt > 120000) {
let areaMonster = monsters[Math.floor(Math.random() * monsters.length)]
let monster = areaMonster.name
let monsterName = monster.toUpperCase()
let coins = Math.floor(Math.random() * 401)
let exp = Math.floor(Math.random() * 601)
let sum = 82
let damage = player.sword * 5 + player.armor * 5 - sum
damage = damage < 0 ? Math.abs(damage) : 0
player.health -= damage
player.lasthunt = new Date().getTime()
if (player.health <= 0) {
player.health = player.maxhealth || 100
player.level = Math.max(0, player.level - 1)
let deathMessage = `🍓 *@${m.sender.split("@")[0]}, kamu tewas dibunuh oleh ${monsterName}...*\n✨ *Level kamu turun 1 karena mati saat berburu.*`
return conn.reply(m.chat, deathMessage, m, { mentions: [m.sender] })
}
player.money += coins
player.exp += exp
let message = `*🍓 @${m.sender.split("@")[0]} berhasil mengalahkan ${monsterName}~*\n🍬 *+${new Intl.NumberFormat('id-ID').format(coins)} uang*\n🍓 *+${new Intl.NumberFormat('id-ID').format(exp)} XP*\n💔 *-${damage} HP (tersisa ${player.health}*`
await conn.reply(m.chat, message, m, { mentions: [m.sender] })
} else {
conn.reply(m.chat, `⏳ *Tunggu 00:0${remainingMinutes}:${remainingSeconds} lagi untuk berburu lagi, yaa~*`, m)
}
}

handler.help = ['hunt']
handler.tags = ['rpg']
handler.command = /^(hunt(ing)?)$/i
handler.register = true
handler.group = true
handler.rpg = true
handler.energy = 50

export default handler