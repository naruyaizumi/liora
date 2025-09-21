let handler = async (m, { args, conn }) => {
    const domain = global.config.domain;
    const apikey = global.config.apikey;
    const suspendAll = args[0] === "all";
    try {
        const usersResponse = await fetch(`${domain}/api/application/users`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`,
            },
        });
        const usersRes = await usersResponse.json();
        if (!usersResponse.ok || usersRes.errors)
            throw new Error(
                usersRes.errors ? usersRes.errors[0].detail : "Gagal mengambil daftar user."
            );
        const nonAdminUsers = usersRes.data.filter((user) => !user.attributes.root_admin);
        if (suspendAll) {
            const serversResponse = await fetch(`${domain}/api/application/servers`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apikey}`,
                },
            });
            const serversRes = await serversResponse.json();
            if (!serversResponse.ok || serversRes.errors)
                throw new Error(
                    serversRes.errors
                        ? serversRes.errors[0].detail
                        : "Gagal mengambil daftar server."
                );
            const serversToSuspend = serversRes.data.filter((server) =>
                nonAdminUsers.some((user) => user.attributes.id === server.attributes.user)
            );
            if (serversToSuspend.length === 0)
                return conn.sendMessage(
                    m.chat,
                    { text: "🍩 *Tidak ada server yang akan disuspend!*" },
                    { quoted: m }
                );
            let reportText = "🍓 *`𝙎𝙐𝙎𝙋𝙀𝙉𝘿 𝙍𝙀𝙋𝙊𝙍𝙏 - 𝘼𝙇𝙇`* 🍓\n";
            for (const server of serversToSuspend) {
                const suspendResponse = await fetch(
                    `${domain}/api/application/servers/${server.attributes.id}/suspend`,
                    {
                        method: "POST",
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${apikey}`,
                        },
                    }
                );
                if (suspendResponse.ok) {
                    reportText += `🍰 *${server.attributes.name} ID: ${server.attributes.id} - SUSPENDED*\n`;
                } else {
                    reportText += `🧁 *${server.attributes.name} ID: ${server.attributes.id} - FAILED*\n`;
                }
            }
            return conn.sendMessage(m.chat, { text: reportText }, { quoted: m });
        }
        const srv = args[0];
        if (!srv)
            return conn.sendMessage(
                m.chat,
                { text: "🍩 *Mohon masukkan ID Server yang valid!*" },
                { quoted: m }
            );
        const serverResponse = await fetch(`${domain}/api/application/servers/${srv}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`,
            },
        });
        const serverData = await serverResponse.json();
        if (!serverResponse.ok || serverData.errors)
            throw new Error(serverData.errors[0].detail || "*Server tidak ditemukan.*");
        const serverName = serverData.attributes.name || "-";
        if (serverData.attributes.suspended)
            return conn.sendMessage(
                m.chat,
                { text: `🍓 *Server dengan ID ${srv} sudah dalam keadaan suspend.*` },
                { quoted: m }
            );
        const suspendResponse = await fetch(`${domain}/api/application/servers/${srv}/suspend`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${apikey}`,
            },
        });
        let reportText = `🍰 *\`𝙎𝙐𝙎𝙋𝙀𝙉𝘿 𝙍𝙀𝙋𝙊𝙍𝙏 - 𝙄𝘿\`* 🍰\n\n🍩 *Server Name: ${serverName}*\n🍓 *Server ID: ${srv}*\n`;
        reportText += suspendResponse.ok
            ? "🍰 *Status: SUSPENDED*\n*Server berhasil di-suspend.*"
            : "🧁 *Status: FAILED*\n*Gagal suspend server.*";
        return conn.sendMessage(m.chat, { text: reportText }, { quoted: m });
    } catch (error) {
        console.error(error);
        conn.sendMessage(
            m.chat,
            { text: `🍩 *Terjadi kesalahan: ${error.message}*` },
            { quoted: m }
        );
    }
};

handler.help = ["suspend"];
handler.tags = ["server"];
handler.command = /^(suspend|su)$/i;
handler.owner = true;

export default handler;
