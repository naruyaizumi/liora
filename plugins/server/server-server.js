const formatRamDisk = (value) =>
    value === "0"
        ? "Unlimited"
        : value.length > 4
          ? value.slice(0, 2) + "GB"
          : value.charAt(0) + "GB";
const formatCpu = (value) => (value === "0" ? "Unlimited" : value + "%");
const plans = {
    "1gb": { ram: "1024", disk: "2048", cpu: "15" },
    "2gb": { ram: "2048", disk: "4096", cpu: "25" },
    "3gb": { ram: "3072", disk: "6144", cpu: "35" },
    "4gb": { ram: "4096", disk: "8192", cpu: "50" },
    "5gb": { ram: "5120", disk: "10240", cpu: "60" },
    "6gb": { ram: "6144", disk: "12288", cpu: "70" },
    "7gb": { ram: "7168", disk: "14336", cpu: "80" },
    "8gb": { ram: "8192", disk: "16384", cpu: "90" },
    "9gb": { ram: "9216", disk: "18432", cpu: "100" },
    "10gb": { ram: "10240", disk: "20480", cpu: "110" },
    unlimited: { ram: "0", disk: "0", cpu: "0" },
};
let handler = async (m, { args, conn }) => {
    let input = args.join(" ").split(".");
    if (input.length < 2) return m.reply("🍩 *Format salah!*\n🍓 *Contoh:* .addserver 12.62xxx");
    let [userId, numberRaw, planKey] = input;
    userId = parseInt(userId);
    if (isNaN(userId)) return m.reply("🍩 *User ID tidak valid! Gunakan angka.*");
    let number = numberRaw.replace(/[^\d+]/g, "") + "@s.whatsapp.net";
    if (!planKey) {
        let sections = Object.keys(plans).map((plan) => ({
            title: `🍪 Paket ${plan.toUpperCase()}`,
            rows: [
                {
                    title: `.addsrv ${userId}.${numberRaw}.${plan}`,
                    description: `🍰 RAM: ${formatRamDisk(plans[plan].ram)} | 🍩 Disk: ${formatRamDisk(plans[plan].disk)} | 🍓 CPU: ${formatCpu(plans[plan].cpu)}`,
                },
            ],
        }));
        return await conn.sendMessage(
            m.chat,
            {
                text: "🍬 *Pilih spesifikasi server Anda:*",
                footer: "🍰 Naruya Izumi 2025 🍩",
                title: "🍪 Pilih Paket",
                buttonText: "🍓 Pilih Disini",
                sections,
            },
            { quoted: m }
        );
    }
    let plan = plans[planKey];
    if (!plan) return m.reply("🍩 *Paket tidak valid!*");
    try {
        m.reply(`🍬 *ID Pengguna: ${userId}*\n🍓 Sedang membuat server...`);
        let eggData = await fetch(
            `${global.config.domain}/api/application/nests/${global.config.nestid}/eggs/${global.config.egg}`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${global.config.apikey}`,
                },
            }
        );
        let eggInfo = await eggData.json();
        if (!eggData.ok || !eggInfo.attributes?.startup)
            return m.reply("🍩 *Gagal membaca konfigurasi startup dari Egg!*");
        let serverResponse = await fetch(`${global.config.domain}/api/application/servers`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${global.config.apikey}`,
            },
            body: JSON.stringify({
                name: `Server-${userId}`,
                description: "COPYRIGHT © 2025 NARUYA IZUMI.",
                user: userId,
                egg: parseInt(global.config.egg),
                docker_image: "docker.io/bionicc/nodejs-wabot:20",
                startup: eggInfo.attributes.startup,
                environment: {
                    INST: "npm",
                    USER_UPLOAD: "0",
                    AUTO_UPDATE: "0",
                    CMD_RUN: "npm start",
                },
                limits: { memory: plan.ram, swap: 0, disk: plan.disk, io: 500, cpu: plan.cpu },
                feature_limits: { databases: 5, backups: 5, allocations: 5 },
                deploy: {
                    locations: [parseInt(global.config.loc)],
                    dedicated_ip: false,
                    port_range: [],
                },
            }),
        });
        let serverData = await serverResponse.json();
        if (!serverResponse.ok || serverData.errors) {
            let errorMessage = serverData.errors
                ? serverData.errors[0].detail
                : "🍩 *Gagal membuat server di panel.*";
            return m.reply(errorMessage);
        }
        let server = serverData.attributes;
        let teks = `
📑 *\`DETAIL SERVER\`*
━━━━━━━━━━━━━━━━━━━━
🍪 *ID Server: ${server.id}*
🍰 *Nama: Server-${userId}*
🍩 *ID Pengguna: ${userId}*
🧁 *Masa Berlaku: 30 Hari*

📊 *\`SPESIFIKASI\`*
━━━━━━━━━━━━━━━━━━━━
🍰 *RAM: ${formatRamDisk(plan.ram)}*
🍩 *Disk: ${formatRamDisk(plan.disk)}*
🍓 *CPU: ${formatCpu(plan.cpu)}*
`;

        await conn.sendMessage(
            number,
            {
                text: teks,
                footer: "🍰 Naruya Izumi 2025 🍩",
                title: "🍪 Detail Server",
                interactiveButtons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🍩 Salin ID Server",
                            copy_code: server.id,
                        }),
                    },
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🍓 Unduh Aplikasi",
                            url: global.config.domain,
                            merchant_url: global.config.domain,
                        }),
                    },
                ],
                hasMediaAttachment: false,
            },
            { quoted: m }
        );

        m.reply("🍬 *Detail server berhasil dikirim ke nomor tujuan!*");
    } catch (error) {
        console.error(error);
        m.reply("🍩 *Terjadi kesalahan dalam pembuatan server, coba lagi nanti!*");
    }
};

handler.help = ["addserver"];
handler.tags = ["server"];
handler.command = /^(addsrv|addserver)$/i;
handler.premium = true;

export default handler;
