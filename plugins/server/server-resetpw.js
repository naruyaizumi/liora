import crypto from "crypto";

let handler = async (m, { args, conn }) => {
    if (!args[0])
        return m.reply("🍩 *Format salah!*\n🍓 *Gunakan: .resetpw <UserID>.<NomorWhatsApp>*");
    const domain = global.config.domain;
    const apikey = global.config.apikey;
    const [userId, phoneNumberRaw] = args[0].split(".");
    if (!userId || !phoneNumberRaw)
        return m.reply("🍩 *Format salah!*\n🍓 *Gunakan: .resetpw <UserID>.<Nomor>*");
    const phoneNumber = `${phoneNumberRaw}@s.whatsapp.net`;
    const newPassword = crypto.randomBytes(3).toString("hex");
    const userResponse = await fetch(`${domain}/api/application/users/${userId}`, {
        method: "GET",
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apikey}`,
        },
    });
    if (!userResponse.ok) {
        const error = await userResponse.json();
        throw new Error(
            error.errors ? error.errors[0].detail : "🍰 Gagal mengambil data pengguna!"
        );
    }
    const userData = await userResponse.json();
    const patchResponse = await fetch(`${domain}/api/application/users/${userId}`, {
        method: "PATCH",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${apikey}`,
        },
        body: JSON.stringify({
            email: userData.attributes.email,
            username: userData.attributes.username,
            first_name: userData.attributes.first_name,
            last_name: userData.attributes.last_name,
            password: newPassword,
            root_admin: userData.attributes.root_admin,
            language: userData.attributes.language,
        }),
    });
    if (!patchResponse.ok) {
        const error = await patchResponse.json();
        throw new Error(error.errors ? error.errors[0].detail : "🍩 Gagal mengganti password!");
    }
    const teks = `
🧁 *RESET PASSWORD BERHASIL* 🧁
━━━━━━━━━━━━━━━━━━━━━━━
🍓 *User ID: ${userId}*
🍪 *Username: ${userData.attributes.username}*
🍫 *Email: ${userData.attributes.email}*
🍰 *Password Baru: ${newPassword}*
━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *Silakan login dengan password baru ini.*
`;
    await conn.sendMessage(
        phoneNumber,
        {
            text: teks,
            footer: "🍰 Naruya Izumi 2025 🍩",
            title: "🍪 Reset Password",
            interactiveButtons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🍬 Salin Password",
                        copy_code: newPassword,
                    }),
                },
            ],
            hasMediaAttachment: false,
        },
        { quoted: m }
    );
    m.reply(`🍓 *Password berhasil direset!* Detail sudah dikirim ke nomor: ${phoneNumberRaw}`);
};

handler.help = ["resetpw"];
handler.tags = ["server"];
handler.command = /^(resetpw)$/i;
handler.owner = true;

export default handler;
