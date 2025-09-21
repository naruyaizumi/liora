import { createPanelAccount, formatRamDisk, formatCpu, plans } from "../../lib/server.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let input = args.join(" ").split(".");
    if (input.length < 2) return m.reply("🍩 *Format salah!*\n🍓 *Contoh:* .cpanel izumi.62xxx");
    let [username, numberRaw, planKey] = input;
    if (!planKey) {
        let sections = [
            {
                title: "🍪 Pilih Spesifikasi Server",
                rows: Object.keys(plans).map((plan) => ({
                    title: `🍰 Paket ${plan.toUpperCase()}`,
                    description: `🍩 RAM: ${formatRamDisk(plans[plan].ram)} | 🍓 Disk: ${formatRamDisk(plans[plan].disk)} | 🍬 CPU: ${formatCpu(plans[plan].cpu)}`,
                    id: `${usedPrefix + command} ${username}.${numberRaw}.${plan}`,
                })),
            },
        ];
        return await conn.sendMessage(
            m.chat,
            {
                text: "🍪 *Pilih spesifikasi server Anda:*",
                footer: "🍰 Naruya Izumi 2025 🍩",
                title: "📑 Paket Server Panel",
                interactiveButtons: [
                    {
                        name: "single_select",
                        buttonParamsJson: JSON.stringify({
                            title: "🍬 Klik untuk memilih paket",
                            sections,
                        }),
                    },
                ],
                hasMediaAttachment: false,
            },
            { quoted: m }
        );
    }
    try {
        const { server, user, email, password, expiresAt, plan } = await createPanelAccount(
            username,
            numberRaw,
            planKey
        );
        let teks = `
📑 *\`DETAIL AKUN\`*
━━━━━━━━━━━━━━━━━━━━
🍬 *ID Server: ${server.id}*
🍰 *Nama: ${username}*
🍩 *Username: ${user.username}*
🍪 *Email: ${email}*
🍫 *Password: ${password}*
🧁 *Masa Berlaku: ${new Date(expiresAt).toLocaleDateString("id-ID")}*
🍓 *Login: ${global.config.domain}*

📊 *\`SPESIFIKASI\`*
━━━━━━━━━━━━━━━━━━━━
🍰 *RAM: ${formatRamDisk(plan.ram)}*
🍩 *Disk: ${formatRamDisk(plan.disk)}*
🍓 *CPU: ${formatCpu(plan.cpu)}*
`;
        let number = numberRaw.replace(/[^\d+]/g, "") + "@s.whatsapp.net";
        await conn.sendMessage(
            number,
            {
                text: teks,
                footer: "🍰 Naruya Izumi 2025 🍩",
                title: "🍪 Detail Akun",
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🍩 Salin Username",
                            copy_code: user.username,
                        }),
                    },
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🍫 Salin Password",
                            copy_code: password,
                        }),
                    },
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🍓 Login Web",
                            url: global.config.domain,
                            merchant_url: global.config.domain,
                        }),
                    },
                ],
                hasMediaAttachment: false,
            },
            { quoted: m }
        );
        m.reply("🍬 *Detail akun berhasil dikirim ke nomor tujuan!*");
    } catch (error) {
        console.error(error);
        m.reply(`❌ ${error.message}`);
    }
};

handler.help = ["cpanel"];
handler.tags = ["server"];
handler.command = /^(cpanel)$/i;
handler.premium = true;

export default handler;
